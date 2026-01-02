import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';

export async function POST({ request, cookies }) {
  try {
    const sessionId = cookies.get('sessionid');
    
    if (!sessionId) {
      return json({
        success: false,
        error: 'No session found'
      }, { status: 401 });
    }

    // Get user info from session
    const { getUserInfoBySessionId } = await import('$lib/server/auth.js');
    const userInfo = await getUserInfoBySessionId(sessionId);
    
    if (!userInfo) {
      return json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const body = await request.json();
    let projectEggId = body.projectEggId;
    
    if (!projectEggId) {
      return json({
        success: false,
        error: 'Project ID is required'
      }, { status: 400 });
    }

    // Handle if projectEggId is an array (take first element)
    if (Array.isArray(projectEggId)) {
      projectEggId = projectEggId[0];
    }
    
    // Convert to string and clean up
    projectEggId = String(projectEggId).trim();

    // Validate projectEggId format (should be Airtable record ID)
    if (!projectEggId.startsWith('rec')) {
      return json({
        success: false,
        error: 'Invalid project ID format'
      }, { status: 400 });
    }

    // SECURITY: Verify user has authenticated with Hack Club
    const hackclubId = String(userInfo.hackclub_id || '');
    if (!hackclubId || hackclubId.trim() === '') {
      return json({
        success: false,
        error: 'You must authenticate with Hack Club before shipping projects. Go to Profile Settings to verify your identity.'
      }, { status: 403 });
    }

    // Extract user details from Hack Club Auth stored in user profile
    let firstName = '';
    let lastName = '';
    let addressLine1 = '';
    let addressLine2 = '';
    let city = '';
    let state = '';
    let country = '';
    let zipCode = '';
    
    // Parse name into first/last name
    const hackclubName = String(userInfo.hackclub_name || '');
    if (hackclubName) {
      const nameParts = hackclubName.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }
    
    // Parse address if available (stored as JSON string)
    const hackclubAddress = String(userInfo.hackclub_address || '');
    if (hackclubAddress) {
      try {
        const address = JSON.parse(hackclubAddress);
        // OIDC address format: street_address, locality (city), region (state), postal_code, country
        addressLine1 = String(address.street_address || '').substring(0, 200);
        city = String(address.locality || '').substring(0, 100);
        state = String(address.region || '').substring(0, 100);
        country = String(address.country || '').substring(0, 100);
        zipCode = String(address.postal_code || '').substring(0, 20);
      } catch (e) {
        console.error('Failed to parse hackclub_address:', e);
      }
    }
    
    // Extract birthday if available
    const hackclubBirthday = userInfo.hackclub_birthday ? String(userInfo.hackclub_birthday).trim() : '';
    
    // Debug logging (remove sensitive data in production)
    if (!hackclubBirthday) {
      console.log('No hackclub_birthday found in userInfo for submission');
    } else {
      console.log('Found hackclub_birthday for submission:', hackclubBirthday.substring(0, 10)); // Log first 10 chars
    }

    // Get the project's hours logged for the submission and verify ownership
    let hoursLogged = 0;
    try {
      const projectRecord = await base('Projects').find(projectEggId);
      
      // CRITICAL SECURITY: Verify that the project belongs to the current user
      const projectUserField = projectRecord.fields.user;
      const projectUserIds = Array.isArray(projectUserField) ? projectUserField : 
                             (projectUserField ? [String(projectUserField)] : []);
      
      if (!projectUserIds.includes(userInfo.recId)) {
        return json({
          success: false,
          error: 'Unauthorized: You can only create submissions for your own projects'
        }, { status: 403 });
      }
      
      if (projectRecord) {
        const hackatimeHours = typeof projectRecord.fields.hackatimeHours === 'number' ? projectRecord.fields.hackatimeHours : 0;
        const artHours = typeof projectRecord.fields.artHours === 'number' ? projectRecord.fields.artHours : 0;
        hoursLogged = hackatimeHours + artHours;
      }
    } catch (error) {
      console.error('Failed to fetch project hours:', error);
      return json({
        success: false,
        error: 'Project not found'
      }, { status: 404 });
    }

    // Create entry in YSWS Project Submission table
    const submissionData = {
      'projectEgg': [projectEggId], // Link to Projects entry
      'submit_token': hackclubId, // Use Hack Club ID as the submit token
      'hoursLogged': hoursLogged,    // Hours logged from the project
      'First Name': firstName,       // First name from Hack Club Auth
      'Last Name': lastName,         // Last name from Hack Club Auth
      'Address (Line 1)': addressLine1,
      'Address (Line 2)': addressLine2,
      'City': city,
      'State / Province': state,
      'Country': country,
      'ZIP / Postal Code': zipCode,
      'Birthday': hackclubBirthday || ''
    };

    const result = await base('YSWS Project Submission').create(submissionData);

    return json({
      success: true,
      submissionId: result.id,
      submission: {
        id: result.id,
        projectEgg: result.fields.projectEgg
      }
    });

  } catch (err) {
    console.error('Create submission error:', err);
    return json({
      success: false,
      error: 'Failed to create project submission'
    }, { status: 500 });
  }
}
