import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { escapeAirtableFormula, checkRateLimit, getClientIdentifier } from '$lib/server/security.js';

export async function GET({ params, cookies, request }) {
  try {
    // Rate limiting: 20 requests per minute per client
    const clientId = getClientIdentifier(request, cookies);
    if (!checkRateLimit(`ysws-submission:${clientId}`, 20, 60000)) {
      return json({
        success: false,
        error: 'Too many requests. Please try again later.'
      }, { status: 429 });
    }

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

    // Validate projectId format (should be Airtable record ID)
    if (typeof projectId !== 'string' || !projectId.startsWith('rec') || projectId.length < 10) {
      return json({
        success: false,
        error: 'Invalid project ID format'
      }, { status: 400 });
    }

    // First verify that the project belongs to the current user
    let projectRecord;
    try {
      projectRecord = await base('Projects').find(projectId);
    } catch (error) {
      console.error('Error fetching project:', error);
      return json({
        success: false,
        error: 'Project not found'
      }, { status: 404 });
    }

    const projectUserField = projectRecord.fields.user;
    const projectUserIds = Array.isArray(projectUserField) ? projectUserField : 
                           (projectUserField ? [String(projectUserField)] : []);
    
    if (!projectUserIds.includes(userInfo.recId)) {
      return json({
        success: false,
        error: 'Unauthorized access to project'
      }, { status: 403 });
    }

    // Check if the project has a YSWS Project Submission link
    const projectYSWSField = projectRecord.fields['YSWS Project Submission'];
    let submissionRecord = null;
    
    if (projectYSWSField && Array.isArray(projectYSWSField) && projectYSWSField.length > 0) {
      // Project has a direct link to YSWS submission (most recent one)
      // Get the last submission in the array (most recent)
      const mostRecentSubmissionId = projectYSWSField[projectYSWSField.length - 1];
      try {
        submissionRecord = await base('YSWS Project Submission').find(mostRecentSubmissionId);
      } catch (error) {
        console.error('Error fetching linked YSWS submission:', error);
        return json({
          success: false,
          error: 'Failed to fetch submission data'
        }, { status: 500 });
      }
    } else {
      // No direct link, try to find by projectEgg field using the correct Airtable pattern
      /** @type {any[]} */
      let submissions = [];
      
      try {
        // Use the correct Airtable pattern for querying linked fields
        // Get all submissions and sort by creation date to get the most recent
        const escapedProjectId = escapeAirtableFormula(projectId);
        const result = await base('YSWS Project Submission').select({
          filterByFormula: `FIND("${escapedProjectId}", ARRAYJOIN({projectEgg}, ",")) > 0`,
          sort: [{field: 'Created', direction: 'desc'}], // Get most recent first
          maxRecords: 1
        }).all();
        
        submissions = Array.from(result);
      } catch (filterError) {
        console.error('Error with projectEgg filter:', filterError);
        // Return empty result instead of error
        submissions = [];
      }
      
      if (submissions.length === 0) {
        return json({
          success: false,
          error: 'No submission found for this project'
        }, { status: 404 });
      }
      
      submissionRecord = submissions[0];
    }

    // Check if this submission has been reviewed yet
    const hasReviewNotes = submissionRecord.fields.notesToUser && 
                          String(submissionRecord.fields.notesToUser).trim() !== '';
    const hasCoinsAwarded = submissionRecord.fields.coinsAwarded && 
                           Number(submissionRecord.fields.coinsAwarded) > 0;

    // If no review data yet, return success but with empty data (shows "under review" in UI)
    if (!hasReviewNotes && !hasCoinsAwarded) {
      return json({
        success: true,
        data: {
          id: submissionRecord.id,
          notesToUser: '',
          coinsAwarded: 0,
          underReview: true // Flag to indicate it's awaiting review
        }
      });
    }

    // Return the submission data (user can only access their own data due to ownership verification above)
    // Only return the fields needed for the UI - exclude sensitive personal data
    return json({
      success: true,
      data: {
        id: submissionRecord.id,
        notesToUser: String(submissionRecord.fields.notesToUser || '').substring(0, 1000), // Limit length
        coinsAwarded: Math.max(0, Number(submissionRecord.fields.coinsAwarded || 0)), // Ensure non-negative
        underReview: false
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
