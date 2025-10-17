import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { escapeAirtableFormula } from '$lib/server/security.js';
import { getCreatureImageFromEgg } from '$lib/data/prompt-data.js';

export async function POST({ request, cookies }) {
  try {
    // Get user info from session
    const sessionId = cookies.get('sessionid');
    const userInfo = await getUserInfoBySessionId(sessionId || '');
    
    if (!userInfo) {
      return json({ 
        success: false, 
        error: { message: 'Authentication required' } 
      }, { status: 401 });
    }

    const { projectId, notMadeBy, howToPlay, addnComments, saveFormOnly, shipProject, hatchEgg, yswsSubmissionId } = await request.json();
    
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
    
    if (!projectData.projectname || projectData.projectname === 'untitled game!' || (typeof projectData.projectname === 'string' && projectData.projectname.trim() === '')) {
      validationErrors.push('Project name is required');
    }
    
    if (!projectData.description || (typeof projectData.description === 'string' && projectData.description.trim() === '')) {
      validationErrors.push('Game description is required');
    }
    
    if (!projectData.shipURL || (typeof projectData.shipURL === 'string' && projectData.shipURL.trim() === '')) {
      validationErrors.push('Ship URL is required');
    }
    
    if (!projectData.githubURL || (typeof projectData.githubURL === 'string' && projectData.githubURL.trim() === '')) {
      validationErrors.push('GitHub URL is required');
    }
    
    if (!projectData.hackatimeHours || (typeof projectData.hackatimeHours === 'number' && projectData.hackatimeHours <= 0)) {
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
      // Hatch the egg - change image to corresponding creature and status
      const currentEggImage = String(projectData.egg || 'projects/new_egg1.png');
      const creatureImage = getCreatureImageFromEgg(currentEggImage);
      
      await projectsTable.update(projectRecord.id, {
        egg: creatureImage,
        status: 'submitted'
      });

      const responseData = {
        success: true,
        message: 'Egg hatched successfully!',
        project: {
          id: projectRecord.id, // Use the actual record ID
          name: projectData.projectname,
          egg: creatureImage,
          status: 'submitted'
        }
      };
      
      return json(responseData);
    }

    // Check if project is already submitted (only when actually shipping)
    if (shipProject && projectData.status === 'submitted') {
      return json({ 
        success: false, 
        error: { message: 'Project has already been submitted' } 
      }, { status: 400 });
    }

    // Validate that all required profile fields are filled before shipping
    if (shipProject) {
      const missingFields = [];
      
      if (!userInfo.username || (typeof userInfo.username === 'string' && userInfo.username.trim() === '')) {
        missingFields.push('username');
      }
      if (!userInfo.githubUsername || (typeof userInfo.githubUsername === 'string' && userInfo.githubUsername.trim() === '')) {
        missingFields.push('GitHub username');
      }
      if (!userInfo.howDidYouHear || (typeof userInfo.howDidYouHear === 'string' && userInfo.howDidYouHear.trim() === '')) {
        missingFields.push('how you heard about this');
      }
      if (!userInfo.doingWell || (typeof userInfo.doingWell === 'string' && userInfo.doingWell.trim() === '')) {
        missingFields.push('what we are doing well');
      }
      if (!userInfo.improve || (typeof userInfo.improve === 'string' && userInfo.improve.trim() === '')) {
        missingFields.push('how we can improve');
      }

      if (missingFields.length > 0) {
        return json({ 
          success: false, 
          error: { 
            message: `Please complete your profile before shipping. Missing: ${missingFields.join(', ')}. Go to your profile settings to fill these out.` 
          } 
        }, { status: 400 });
      }
    }

    // Ship the project by updating the status to "submitted"
    if (shipProject) {
      const updateData = {
        status: 'submitted',
        shippedDate: new Date().toISOString(),
        hoursShipped: projectData.totalHours || 0
      };
      
      // Add YSWS submission link if provided
      if (yswsSubmissionId) {
        updateData['YSWS Project Submission'] = [yswsSubmissionId];
      }
      
      await projectsTable.update(projectRecord.id, updateData);
    }

    // Only calculate and award coins when actually shipping
    if (shipProject) {
      // Calculate coins earned (4-10 coins per hour, default to 8 for now)
      const hoursWorked = typeof projectData.hackatimeHours === 'number' ? projectData.hackatimeHours : 0;
      const coinsPerHour = 8; // Default rate, could be adjusted based on project quality
      const coinsEarned = Math.round(hoursWorked * coinsPerHour);

      // Update user's coins
      const usersTable = base('User');
      const userRecords = await usersTable.select({
        filterByFormula: `{email} = "${escapeAirtableFormula(typeof userInfo.email === 'string' ? userInfo.email : '')}"`
      }).all();

      if (userRecords.length > 0) {
        const userRecord = userRecords[0];
        const currentCoins = typeof userRecord.fields.coins === 'number' ? userRecord.fields.coins : 0;
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
          status: 'submitted',
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
