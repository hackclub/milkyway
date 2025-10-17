import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { escapeAirtableFormula } from '$lib/server/security.js';

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

    const { projectEggId, submitToken, identityData } = await request.json();
    
    // Removed debug logging of sensitive data
    
    if (!projectEggId || !submitToken) {
      return json({
        success: false,
        error: 'Project ID and submit token are required'
      }, { status: 400 });
    }

    // Validate projectEggId format (should be Airtable record ID)
    if (typeof projectEggId !== 'string' || !projectEggId.startsWith('rec')) {
      return json({
        success: false,
        error: 'Invalid project ID format'
      }, { status: 400 });
    }

    // Validate submitToken format (should be UUID-like)
    if (typeof submitToken !== 'string' || submitToken.length < 10) {
      return json({
        success: false,
        error: 'Invalid submit token format'
      }, { status: 400 });
    }

    // Extract and sanitize user details from the passed identity data
    let firstName = '';
    let lastName = '';
    let addressLine1 = '';
    let addressLine2 = '';
    let city = '';
    let state = '';
    let country = '';
    let zipCode = '';
    let birthday = '';
    
    if (identityData && identityData.identity_response) {
      // Extract and sanitize names (limit length to prevent abuse)
      firstName = String(identityData.identity_response.first_name || '').substring(0, 100);
      lastName = String(identityData.identity_response.last_name || '').substring(0, 100);
      
      // Extract and validate birthday format (YYYY-MM-DD)
      const birthdayStr = String(identityData.identity_response.birthday || '');
      if (birthdayStr && /^\d{4}-\d{2}-\d{2}$/.test(birthdayStr)) {
        birthday = birthdayStr;
      }
      
      // Extract and sanitize address data
      if (identityData.identity_response.addresses && Array.isArray(identityData.identity_response.addresses) && identityData.identity_response.addresses.length > 0) {
        const address = identityData.identity_response.addresses[0]; // Use first address
        addressLine1 = String(address.line_1 || '').substring(0, 200);
        addressLine2 = String(address.line_2 || '').substring(0, 200);
        city = String(address.city || '').substring(0, 100);
        state = String(address.state || '').substring(0, 100);
        country = String(address.country || '').substring(0, 100);
        zipCode = String(address.postal_code || '').substring(0, 20);
      }
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
      
      if (projectRecord && projectRecord.fields.totalHours) {
        hoursLogged = typeof projectRecord.fields.totalHours === 'number' ? 
                     projectRecord.fields.totalHours : 0;
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
      'submit_token': submitToken,   // auth_id from identity verification
      'hoursLogged': hoursLogged,    // Hours logged from the project
      'First Name': firstName,       // First name from identity verification
      'Last Name': lastName,         // Last name from identity verification
      'Address (Line 1)': addressLine1,     // Address line 1
      'Address (Line 2)': addressLine2,     // Address line 2
      'City': city,                  // City
      'State / Province': state,     // State/Province
      'Country': country,            // Country
      'ZIP / Postal Code': zipCode   // ZIP/Postal Code
    };

    // Only include birthday if it has a valid value (to avoid Airtable date parsing errors)
    if (birthday && birthday.trim() !== '') {
      submissionData['Birthday'] = birthday;
    }

    const result = await base('YSWS Project Submission').create(submissionData);

    return json({
      success: true,
      submission: {
        id: result.id,
        projectEgg: result.fields.projectEgg,
        submitToken: result.fields.submit_token
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
