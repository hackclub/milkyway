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
    const user = await getUserInfoBySessionId(sessionId);
    
    if (!user) {
      return json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Update user's hasOnboarded field to true
    await base('User').update(user.recId, {
      'hasOnboarded': true
    });

    return json({
      success: true,
      message: 'Onboarding completed successfully'
    });

  } catch (err) {
    console.error('Airtable error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to complete onboarding';
    
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 500 });
  }
}
