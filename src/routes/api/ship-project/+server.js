import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { escapeAirtableFormula } from '$lib/server/security.js';

export async function POST({ request, cookies }) {
  try {
    // Get user info from session
    const sessionId = cookies.get('sessionid');
    console.log('Ship project API - Session ID:', sessionId ? 'present' : 'missing');
    
    const userInfo = await getUserInfoBySessionId(sessionId);
    console.log('Ship project API - User info:', userInfo ? 'found' : 'not found');
    
    if (!userInfo) {
      console.log('Ship project API - No user info found, sessionId:', sessionId);
      return json({ 
        success: false, 
        error: { message: 'Authentication required' } 
      }, { status: 401 });
    }

    const { projectId, notMadeBy, howToPlay, addnComments, saveFormOnly, shipProject, hatchEgg } = await request.json();
    
    if (!projectId) {
      return json({ 
        success: false, 
        error: { message: 'Project ID required' } 
      }, { status: 400 });
    }

    // If saving form data only, validate form fields
    if (saveFormOnly) {
      if (!notMadeBy || !howToPlay || !addnComments) {
        return json({ 
          success: false, 
          error: { message: 'All form fields are required' } 
        }, { status: 400 });
      }
    }

    // Get the project from Airtable using the record ID directly
    const projectsTable = base('Projects');
    const projectRecord = await projectsTable.find(projectId);
    const projectData = projectRecord.fields;

    // Validate that the project belongs to the current user
    // The user field is a linked field, so we need to check if the current user's record ID is in the array
    const projectUserField = projectData.user;
    const projectUserIds = Array.isArray(projectUserField) ? projectUserField : 
                           (projectUserField ? [String(projectUserField)] : []);
    
    if (!projectUserIds.includes(userInfo.recId)) {
      return json({ 
        success: false, 
        error: { message: 'Unauthorized access to project' } 
      }, { status: 403 });
    }

    // Validate ship requirements
    const validationErrors = [];
    
    if (!projectData.projectname || projectData.projectname === 'untitled game!' || projectData.projectname.trim() === '') {
      validationErrors.push('Project name is required');
    }
    
    if (!projectData.description || projectData.description.trim() === '') {
      validationErrors.push('Game description is required');
    }
    
    if (!projectData.shipURL || projectData.shipURL.trim() === '') {
      validationErrors.push('Ship URL is required');
    }
    
    if (!projectData.githubURL || projectData.githubURL.trim() === '') {
      validationErrors.push('GitHub URL is required');
    }
    
    if (!projectData.hackatimeHours || projectData.hackatimeHours <= 0) {
      validationErrors.push('Hackatime hours must be greater than 0');
    }
    
    if (!projectData.projectImage && !projectData.image) {
      validationErrors.push('Custom project image is required');
    }

    if (validationErrors.length > 0) {
      return json({ 
        success: false, 
        error: { message: `Validation failed: ${validationErrors.join(', ')}` } 
      }, { status: 400 });
    }

    // Handle different operations based on flags
    if (saveFormOnly) {
      // Just save the form data without shipping
      await projectsTable.update(projectRecord.id, {
        notMadeBy: notMadeBy,
        howToPlay: howToPlay,
        addnComments: addnComments
      });

      return json({
        success: true,
        message: 'Form data saved successfully'
      });
    }

    if (hatchEgg) {
      // Hatch the egg - change image and status
      await projectsTable.update(projectRecord.id, {
        egg: 'projects/new_creature1.png',
        status: 'submitted'
      });

      const responseData = {
        success: true,
        message: 'Egg hatched successfully!',
        project: {
          id: projectRecord.id, // Use the actual record ID
          name: projectData.projectname,
          egg: 'projects/new_creature1.png',
          status: 'submitted'
        }
      };
      
      console.log('API returning project data:', responseData);
      return json(responseData);
    }

    // Check if project is already shipped (only when actually shipping)
    if (shipProject && projectData.shipped === true) {
      return json({ 
        success: false, 
        error: { message: 'Project has already been shipped' } 
      }, { status: 400 });
    }

    // Ship the project by updating the shipped status
    if (shipProject) {
      await projectsTable.update(projectRecord.id, {
        shipped: true,
        shippedDate: new Date().toISOString()
      });
    }

    // Only calculate and award coins when actually shipping
    if (shipProject) {
      // Calculate coins earned (4-10 coins per hour, default to 8 for now)
      const hoursWorked = projectData.hackatimeHours || 0;
      const coinsPerHour = 8; // Default rate, could be adjusted based on project quality
      const coinsEarned = Math.round(hoursWorked * coinsPerHour);

      // Update user's coins
      const usersTable = base('User');
      const userRecords = await usersTable.select({
        filterByFormula: `{email} = "${escapeAirtableFormula(userInfo.email)}"`
      }).all();

      if (userRecords.length > 0) {
        const userRecord = userRecords[0];
        const currentCoins = userRecord.fields.coins || 0;
        const newCoins = currentCoins + coinsEarned;

        await usersTable.update(userRecord.id, {
          coins: newCoins
        });
      }

      return json({
        success: true,
        message: 'Project shipped successfully!',
        coinsEarned: coinsEarned,
        project: {
          id: projectData.id,
          name: projectData.projectname,
          shipped: true,
          shippedDate: new Date().toISOString()
        }
      });
    }

    // This shouldn't be reached, but just in case
    return json({
      success: false,
      error: { message: 'Invalid operation' }
    }, { status: 400 });

  } catch (error) {
    console.error('Error shipping project:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to ship project';
    
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 500 });
  }
}
