import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { fetchProjects } from '$lib/server/hackatime.js';
import { sanitizeErrorMessage } from '$lib/server/security.js';
import { escapeAirtableFormula } from '$lib/server/security.js';

/**
 * Auto-update Hackatime hours for all user projects
 * This endpoint is called automatically after page load to keep project hours up-to-date
 */
export async function POST({ locals }) {
  try {
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = locals.user.email;
    
    // Check if we should skip update based on last update time (rate limiting)
    // Only update if it's been more than 15 minutes since last update
    const now = new Date();
    const lastUpdate = locals.user.lastHackatimeUpdate;
    
    if (lastUpdate) {
      const lastUpdateTime = new Date(lastUpdate);
      const minutesSinceUpdate = (now - lastUpdateTime) / (1000 * 60);
      
      if (minutesSinceUpdate < 15) {
        // Too soon, skip update
        return json({ 
          success: true, 
          skipped: true, 
          message: 'Updated recently, skipping',
          minutesUntilNext: Math.ceil(15 - minutesSinceUpdate)
        });
      }
    }

    // Fetch all user's projects
    const escapedEmail = escapeAirtableFormula(userEmail);
    const records = await base('Projects')
      .select({ filterByFormula: `FIND("${escapedEmail}", ARRAYJOIN({user}, ","))` })
      .all();

    if (records.length === 0) {
      return json({ success: true, updatedCount: 0, message: 'No projects to update' });
    }

    // Filter projects that have Hackatime projects associated
    const projectsToUpdate = records.filter(record => {
      const hackatimeProjects = record.fields.hackatimeProjects;
      return hackatimeProjects && 
             typeof hackatimeProjects === 'string' && 
             hackatimeProjects.trim() !== '';
    });

    if (projectsToUpdate.length === 0) {
      return json({ success: true, updatedCount: 0, message: 'No projects with Hackatime associations' });
    }

    let updatedCount = 0;
    const errors = [];

    // Update each project's hours
    for (const projectRecord of projectsToUpdate) {
      try {
        const projectCreated = projectRecord.fields.countingFrom;
        
        if (!projectCreated) {
          continue; // Skip projects without creation date
        }

        // Calculate start date (1 week before project creation)
        const projectCreatedDate = new Date(String(projectCreated));
        const oneDayBefore = new Date(projectCreatedDate);
        oneDayBefore.setDate(projectCreatedDate.getDate() - 1);
        const startDate = oneDayBefore.toISOString().split('T')[0];

        // Fetch HackaTime data
        const hackatimeData = await fetchProjects(userEmail, null, startDate);

        if (hackatimeData && hackatimeData.data && hackatimeData.data.projects) {
          // Parse selected projects list
          const selectedProjectNames = projectRecord.fields.hackatimeProjects
            .split(', ')
            .filter(n => n.trim());

          // Calculate hours based on actual HackaTime data
          let totalHours = 0;
          for (const htProject of hackatimeData.data.projects) {
            if (selectedProjectNames.includes(htProject.name)) {
              totalHours += htProject.total_seconds / 3600;
            }
          }

          // Round to 2 decimal places
          const calculatedHours = Math.round(totalHours * 100) / 100;

          // Only update if hours have changed
          const currentHours = projectRecord.fields.hackatimeHours || 0;
          if (calculatedHours !== currentHours) {
            await base('Projects').update(projectRecord.id, {
              hackatimeHours: calculatedHours
            });
            updatedCount++;
          }
        }
      } catch (projectError) {
        console.error(`Error updating project ${projectRecord.id}:`, projectError);
        errors.push({
          projectId: projectRecord.id,
          projectName: projectRecord.fields.projectname,
          error: sanitizeErrorMessage(projectError, 'Update failed')
        });
      }
    }

    // Update user's last Hackatime update timestamp
    try {
      await base('User').update(locals.user.recId, {
        lastHackatimeUpdate: now.toISOString()
      });
    } catch (updateError) {
      console.error('Failed to update lastHackatimeUpdate:', updateError);
      // Don't fail the whole operation if timestamp update fails
    }

    return json({ 
      success: true, 
      updatedCount,
      totalProjects: projectsToUpdate.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Updated ${updatedCount} project(s)`
    });

  } catch (error) {
    console.error('Error in auto-update-hackatime:', error);
    return json({
      error: sanitizeErrorMessage(error, 'Failed to auto-update Hackatime hours')
    }, { status: 500 });
  }
}

