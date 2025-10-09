import { json } from '@sveltejs/kit';
import { createProject, updateProject, deleteProject, verifyProjectOwnership } from '$lib/server/projects.js';
import { sanitizeErrorMessage, checkRateLimit, getClientIdentifier } from '$lib/server/security.js';

// GET - Get a single project by ID (used for refreshing project data)
export async function GET({ url, locals, request, cookies }) {
  try {
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 30 GET requests per minute
    const clientId = getClientIdentifier(request, cookies);
    if (!checkRateLimit(`projects-get:${clientId}`, 30, 60000)) {
      return json({ error: 'Too many requests' }, { status: 429 });
    }

    const projectId = url.searchParams.get('id');
    if (!projectId) {
      return json({ error: 'Project ID required' }, { status: 400 });
    }

    // Validate projectId format (Airtable record IDs start with 'rec')
    if (!/^rec[a-zA-Z0-9]{14}$/.test(projectId)) {
      return json({ error: 'Invalid project ID format' }, { status: 400 });
    }

    // Verify project ownership
    const isOwner = await verifyProjectOwnership(projectId, locals.user.email);
    if (!isOwner) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    // Import the base to fetch the project
    const { base } = await import('$lib/server/db.js');
    const record = await base('Projects').find(projectId);
    
    // Parse position data
    const positionStr = typeof record.fields.position === 'string' ? record.fields.position : '0,0';
    const positionParts = positionStr.split(',');
    const x = parseFloat(positionParts[0]) || 0;
    const y = parseFloat(positionParts[1]) || 0;
    
    const project = {
      id: record.id,
      name: record.fields.projectname || 'Untitled Project',
      promptinfo: record.fields.promptinfo || '',
      description: record.fields.description || '',
      addn: record.fields.addn || '',
      event: 'new',
      egg: record.fields.egg || 'projects/sparkle_egg1.png',
      position: record.fields.position || '0,0',
      x: x,
      y: y,
      status: 'active',
      hours: record.fields.hours || 0,
      totalHours: record.fields.totalHours || 0,
      hackatimeProjects: record.fields.hackatimeProjects || [],
      created: record.fields.Created
    };

    return json({ success: true, project });
  } catch (error) {
    console.error('Error fetching project:', error);
    return json({
      error: sanitizeErrorMessage(/** @type {Error} */ (error), 'Failed to fetch project')
    }, { status: 500 });
  }
}

// POST - Create a new project
export async function POST({ request, locals, cookies }) {
  try {
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 10 project creations per hour
    const clientId = getClientIdentifier(request, cookies);
    if (!checkRateLimit(`projects-create:${clientId}`, 10, 3600000)) {
      return json({ error: 'Too many projects created. Please try again later.' }, { status: 429 });
    }

    const projectData = await request.json();

    // Validate required fields
    if (!projectData.name || typeof projectData.name !== 'string') {
      return json({ error: 'Project name is required' }, { status: 400 });
    }

    // Validate project name length
    if (projectData.name.trim().length === 0 || projectData.name.length > 100) {
      return json({ error: 'Project name must be between 1 and 100 characters' }, { status: 400 });
    }

    // Validate description if provided
    if (projectData.description && typeof projectData.description !== 'string') {
      return json({ error: 'Invalid description format' }, { status: 400 });
    }

    const project = await createProject(
      locals.user.recId, {
        name: projectData.name.trim(),
        description: projectData.description || '',
        egg: projectData.egg || 'projects/sparkle_egg1.png',
        addn: projectData.addn // Allow addn to be set during creation
      });
    return json({ success: true, project });

  } catch (error) {
    console.error('Error creating project:', error);
    return json({
      error: sanitizeErrorMessage(/** @type {Error} */ (error), 'Failed to create project')
    }, { status: 500 });
  }
}




// PUT - Update an existing project
export async function PUT({ request, locals, cookies }) {
  try {
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 30 updates per minute
    const clientId = getClientIdentifier(request, cookies);
    if (!checkRateLimit(`projects-update:${clientId}`, 30, 60000)) {
      return json({ error: 'Too many requests' }, { status: 429 });
    }

    const { projectId, updates } = await request.json();

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Validate projectId format (Airtable record IDs)
    if (!/^rec[a-zA-Z0-9]{14}$/.test(projectId)) {
      return json({ error: 'Invalid project ID format' }, { status: 400 });
    }

    // Verify project ownership
    const isOwner = await verifyProjectOwnership(projectId, locals.user.email);
    if (!isOwner) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    // SECURITY: Field whitelist - only allow specific fields to be updated by client
    const allowedFields = ['projectname', 'description', 'position', 'egg', 'hackatimeProjects'];
    const safeUpdates = /** @type {any} */ ({});
    
    // Copy only whitelisted fields
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        safeUpdates[field] = updates[field];
      }
    }

    // SECURITY: Server-side HackaTime hours calculation
    // Never trust client-provided hours - always calculate on server
    if (updates.hackatimeProjects !== undefined) {
      try {
        // Get project creation date for HackaTime query
        const { base } = await import('$lib/server/db.js');
        const projectRecord = await base('Projects').find(projectId);
        const projectCreated = projectRecord.fields.Created;
        
        if (projectCreated) {
          // Calculate start date (1 week before project creation)
          const projectCreatedDate = new Date(String(projectCreated));
          const oneWeekBefore = new Date(projectCreatedDate);
          oneWeekBefore.setDate(projectCreatedDate.getDate() - 7);
          const startDate = oneWeekBefore.toISOString().split('T')[0];
          
          // Fetch HackaTime data SERVER-SIDE
          const { fetchProjects } = await import('$lib/server/hackatime.js');
          const hackatimeData = await fetchProjects(locals.user.email, null, startDate);
          
          if (hackatimeData && hackatimeData.data && hackatimeData.data.projects) {
            // Parse selected projects list
            const selectedProjectNames = typeof safeUpdates.hackatimeProjects === 'string' 
              ? safeUpdates.hackatimeProjects.split(', ').filter(/** @param {string} n */ n => n.trim())
              : [];
            
            // Calculate hours SERVER-SIDE based on actual HackaTime data
            let totalHours = 0;
            for (const htProject of hackatimeData.data.projects) {
              if (selectedProjectNames.includes(htProject.name)) {
                totalHours += htProject.total_seconds / 3600;
              }
            }
            
            // Round to 2 decimal places and use SERVER-CALCULATED value
            safeUpdates.hackatimeHours = Math.round(totalHours * 100) / 100;
            // NOTE: Don't update totalHours - it's a computed field in Airtable
            
            console.log('Server-calculated HackaTime hours:', {
              projectId,
              selectedProjects: selectedProjectNames,
              calculatedHours: safeUpdates.hackatimeHours
            });
          }
        }
      } catch (hackatimeError) {
        // If HackaTime fetch fails, don't update hours but continue with other fields
        console.error('Failed to fetch HackaTime data for hours calculation:', hackatimeError);
        // Don't set hackatimeHours if calculation failed
        delete safeUpdates.hackatimeHours;
      }
    }

    // Log blocked fields for security monitoring
    const blockedFields = Object.keys(updates).filter(k => 
      !allowedFields.includes(k) && 
      k !== 'hackatimeHours' && 
      k !== 'totalHours' && // totalHours is computed, but not a security risk to attempt
      k !== 'hours'  // Legacy field, also computed
    );
    if (blockedFields.length > 0) {
      console.warn('Blocked client attempt to update restricted fields:', {
        projectId,
        blockedFields,
        userId: locals.user.email
      });
    }

    const project = await updateProject(projectId, safeUpdates);
    return json({ success: true, project });
  } catch (error) {
    console.error('Error updating project:', error);
    return json({
      error: sanitizeErrorMessage(/** @type {Error} */ (error), 'Failed to update project')
    }, { status: 500 });
  }
}

// DELETE - Delete a project
export async function DELETE({ request, locals, cookies }) {
  try {
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 10 deletions per hour (prevents spam)
    const clientId = getClientIdentifier(request, cookies);
    if (!checkRateLimit(`projects-delete:${clientId}`, 10, 3600000)) {
      return json({ error: 'Too many requests' }, { status: 429 });
    }

    const { projectId } = await request.json();

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Verify project ownership
    const isOwner = await verifyProjectOwnership(projectId, locals.user.email);
    if (!isOwner) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteProject(projectId);
    return json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return json({
      error: sanitizeErrorMessage(/** @type {Error} */ (error), 'Failed to delete project')
    }, { status: 500 });
  }
}
