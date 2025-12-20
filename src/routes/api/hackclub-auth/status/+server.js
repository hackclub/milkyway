import { json } from '@sveltejs/kit';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { base } from '$lib/server/db.js';

/**
 * Get the current user's Hack Club authentication status
 * GET /api/hackclub-auth/status
 */
export async function GET({ cookies }) {
  try {
    const sessionId = cookies.get('sessionid');
    
    if (!sessionId) {
      return json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    // Get user info
    const user = await getUserInfoBySessionId(sessionId);
    
    if (!user) {
      return json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Fetch full user record from Airtable to get hackclub fields
    const records = await base('User')
      .select({
        filterByFormula: `RECORD_ID() = "${user.recId}"`,
        maxRecords: 1
      })
      .firstPage();

    if (!records.length) {
      return json({
        success: false,
        error: 'User record not found'
      }, { status: 404 });
    }

    const userRecord = records[0].fields;

    // Check if user has authenticated with Hack Club
    const hackclubId = String(userRecord.hackclub_id || '');
    const isAuthenticated = !!(hackclubId && hackclubId.trim() !== '');

    // Return status (only non-sensitive Hack Club data)
    return json({
      success: true,
      isAuthenticated,
      hackclubName: userRecord.hackclub_name ? String(userRecord.hackclub_name) : null,
      hackclubSlackId: userRecord.hackclub_slack_id ? String(userRecord.hackclub_slack_id) : null
    });

  } catch (err) {
    console.error('Hack Club auth status error:', err);
    return json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
