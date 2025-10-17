import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';

export async function GET({ params, cookies }) {
  try {
    const sessionId = cookies.get('sessionid');
    
    if (!sessionId) {
      return json({
        success: false,
        error: 'No session found'
      }, { status: 401 });
    }

    // Get user info from session
    const userInfo = await getUserInfoBySessionId(sessionId);
    
    if (!userInfo) {
      return json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const { projectId } = params;
    
    if (!projectId) {
      return json({
        success: false,
        error: 'Project ID is required'
      }, { status: 400 });
    }

    // First verify that the project belongs to the current user
    const projectRecord = await base('Projects').find(projectId);
    const projectUserField = projectRecord.fields.user;
    const projectUserIds = Array.isArray(projectUserField) ? projectUserField : 
                           (projectUserField ? [String(projectUserField)] : []);
    
    if (!projectUserIds.includes(userInfo.recId)) {
      return json({
        success: false,
        error: 'Unauthorized access to project'
      }, { status: 403 });
    }

    // Find the YSWS submission that links to this project
    console.log('Searching for YSWS submission with project ID:', projectId);
    
    const submissions = await base('YSWS Project Submission').select({
      filterByFormula: `FIND("${projectId}", ARRAYJOIN({projectEgg}, ",")) > 0`,
      maxRecords: 1
    }).all();

    console.log('Found submissions:', submissions.length);
    
    // If no submissions found, let's check all submissions to debug
    if (submissions.length === 0) {
      console.log('No submissions found, checking all submissions...');
      const allSubmissions = await base('YSWS Project Submission').select({
        maxRecords: 10
      }).all();
      
      console.log('All YSWS submissions:');
      allSubmissions.forEach(sub => {
        console.log(`- ID: ${sub.id}, projectEgg: ${JSON.stringify(sub.fields.projectEgg)}`);
      });
      
      return json({
        success: false,
        error: 'No submission found for this project'
      }, { status: 404 });
    }

    const submissionRecord = submissions[0];

    // Return the submission data
    return json({
      success: true,
      data: {
        id: submissionRecord.id,
        hoursLogged: submissionRecord.fields.hoursLogged || 0,
        submitToken: submissionRecord.fields.submit_token,
        firstName: submissionRecord.fields['First Name'] || '',
        lastName: submissionRecord.fields['Last Name'] || '',
        birthday: submissionRecord.fields['Birthday'] || '',
        addressLine1: submissionRecord.fields['Address (Line 1)'] || '',
        addressLine2: submissionRecord.fields['Address (Line 2)'] || '',
        city: submissionRecord.fields['City'] || '',
        state: submissionRecord.fields['State / Province'] || '',
        country: submissionRecord.fields['Country'] || '',
        zipCode: submissionRecord.fields['ZIP / Postal Code'] || ''
      }
    });

  } catch (error) {
    console.error('Error fetching YSWS submission by project:', error);
    return json({
      success: false,
      error: 'Failed to fetch submission data'
    }, { status: 500 });
  }
}
