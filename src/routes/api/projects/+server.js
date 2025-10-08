import { json } from '@sveltejs/kit';
import { createProject, updateProject, deleteProject } from '$lib/server/projects.js';

// GET - Get a single project by ID (used for refreshing project data)
export async function GET({ url, locals }) {
  try {
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = url.searchParams.get('id');
    if (!projectId) {
      return json({ error: 'Project ID required' }, { status: 400 });
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
      error: error instanceof Error ? error.message : 'Failed to fetch project'
    }, { status: 500 });
  }
}

// POST - Create a new project
export async function POST({ request, locals }) {
  try {
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectData = await request.json();

    // Validate required fields
    if (!projectData.name) {
      return json({ error: 'Project name is required' }, { status: 400 });
    }

    const project = await createProject(
      locals.user.recId, {
        name: projectData.name,
        description: projectData.description || '',
        egg: projectData.egg || 'projects/sparkle_egg1.png'
      });
    return json({ success: true, project });

  } catch (error) {
    console.error('Error creating project:', error);
    return json({
      error: error instanceof Error ? error.message : 'Failed to create project'
    }, { status: 500 });
  }
}




// PUT - Update an existing project
export async function PUT({ request, locals }) {
  try {
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, updates } = await request.json();

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    // SECURITY: Remove 'addn' field from updates if present
    // Only server-side code (like roulette spin API) can update addn
    // This prevents users from cheating their roulette spins
    const { addn, ...safeUpdates } = updates;
    
    if (addn !== undefined) {
      console.warn('Attempted to update addn field from client - blocked for security');
    }

    const project = await updateProject(projectId, safeUpdates);
    return json({ success: true, project });
  } catch (error) {
    console.error('Error updating project:', error);
    return json({
      error: error instanceof Error ? error.message : 'Failed to update project'
    }, { status: 500 });
  }
}

// DELETE - Delete a project
export async function DELETE({ request, locals }) {
  try {
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await request.json();

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    await deleteProject(projectId);
    return json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return json({
      error: error instanceof Error ? error.message : 'Failed to delete project'
    }, { status: 500 });
  }
}
