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

    const { id: submissionId } = params;
    
    if (!submissionId) {
      return json({
        success: false,
        error: 'Submission ID is required'
      }, { status: 400 });
    }

    // Fetch the YSWS Project Submission record
    const submissionRecord = await base('YSWS Project Submission').find(submissionId);
    
    if (!submissionRecord) {
      return json({
        success: false,
        error: 'Submission not found'
      }, { status: 404 });
    }

    // Verify that the submission belongs to the current user
    // Check if the linked project belongs to the current user
    const projectEggField = submissionRecord.fields.projectEgg;
    if (!projectEggField || projectEggField.length === 0) {
      return json({
        success: false,
        error: 'Invalid submission - no linked project'
      }, { status: 400 });
    }

    // Get the linked project to verify ownership
    const projectRecord = await base('Projects').find(projectEggField[0]);
    const projectUserField = projectRecord.fields.user;
    const projectUserIds = Array.isArray(projectUserField) ? projectUserField : 
                           (projectUserField ? [String(projectUserField)] : []);
    
    if (!projectUserIds.includes(userInfo.recId)) {
      return json({
        success: false,
        error: 'Unauthorized access to submission'
      }, { status: 403 });
    }

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
    console.error('Error fetching YSWS submission:', error);
    return json({
      success: false,
      error: 'Failed to fetch submission data'
    }, { status: 500 });
  }
}
