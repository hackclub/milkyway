import { json } from '@sveltejs/kit';
import { getUserInfoBySessionId, sanitizeUserForFrontend } from '$lib/server/auth.js';

export async function GET({ cookies }) {
  try {
    const sessionId = cookies.get('sessionid');
    if (!sessionId) {
      return json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const userInfo = await getUserInfoBySessionId(sessionId);
    if (!userInfo) {
      return json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = sanitizeUserForFrontend(userInfo);

    return json({
      success: true,
      user
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to get user profile';
    
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 500 });
  }
}