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
    
    console.log('Creating submission with projectEggId:', projectEggId);
    console.log('submitToken:', submitToken);
    
    if (!projectEggId || !submitToken) {
      return json({
        success: false,
        error: 'Project ID and submit token are required'
      }, { status: 400 });
    }

    // Extract user details from the passed identity data
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
      // Extract names
      firstName = identityData.identity_response.first_name || '';
      lastName = identityData.identity_response.last_name || '';
      
      // Extract birthday
      birthday = identityData.identity_response.birthday || '';
      
      // Extract address data
      if (identityData.identity_response.addresses && identityData.identity_response.addresses.length > 0) {
        const address = identityData.identity_response.addresses[0]; // Use first address
        addressLine1 = address.line_1 || '';
        addressLine2 = address.line_2 || '';
        city = address.city || '';
        state = address.state || '';
        country = address.country || '';
        zipCode = address.postal_code || '';
      }
    }

    // Get the project's hours logged for the submission
    let hoursLogged = 0;
    try {
      const projectRecord = await base('Projects').find(projectEggId);
      if (projectRecord && projectRecord.fields.totalHours) {
        hoursLogged = typeof projectRecord.fields.totalHours === 'number' ? 
                     projectRecord.fields.totalHours : 0;
      }
    } catch (error) {
      console.error('Failed to fetch project hours:', error);
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
