import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { isValidUsername, escapeAirtableFormula, sanitizeErrorMessage } from '$lib/server/security.js';

export async function POST({ request, cookies }) {
  try {
    const { username } = await request.json();
    const sessionId = cookies.get('sessionid');
    
    if (!sessionId) {
      return json({
        success: false,
        error: 'No session found'
      }, { status: 401 });
    }

    if (!username || username.trim() === '') {
      return json({
        success: false,
        error: 'Username is required'
      }, { status: 400 });
    }

    // Validate username format
    if (!isValidUsername(username.trim())) {
      return json({
        success: false,
        error: 'Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens'
      }, { status: 400 });
    }

    // Get user info from session
    const { getUserInfoBySessionId } = await import('$lib/server/auth.js');
    const user = await getUserInfoBySessionId(sessionId);
    
    if (!user) {
      return json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Check if username is already taken
    const escapedUsername = escapeAirtableFormula(username.trim());
    const existingRecords = await base('User')
      .select({
        filterByFormula: `{username} = "${escapedUsername}"`,
        maxRecords: 1
      })
      .firstPage();

    if (existingRecords.length > 0 && existingRecords[0].id !== user.recId) {
      return json({
        success: false,
        error: 'Username is already taken'
      }, { status: 400 });
    }

    // Update user's username in Airtable
    await base('User').update(user.recId, {
      'username': username.trim()
    });

    return json({
      success: true,
      message: 'Username updated successfully'
    });

  } catch (err) {
    console.error('Airtable error:', err);
    const errorMessage = sanitizeErrorMessage(err, 'Failed to update username');
    
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 500 });
  }
}
