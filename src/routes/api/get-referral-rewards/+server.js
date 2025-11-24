import { json } from '@sveltejs/kit';
import { getUserCurrency } from '$lib/server/shop.js';
import { getReferralRewardsByEmail } from '$lib/server/auth.js';

export async function GET({ cookies }) {
  try {
    // Get session from cookies
    const sessionId = cookies.get('sessionid');
    if (!sessionId) {
      return json({
        success: false,
        error: { message: 'Not authenticated' }
      }, { status: 401 });
    }

    // Get user info
    const userInfo = await getReferralRewardsByEmail(sessionId);
    if (!userInfo) {
      return json({
        success: false,
        error: { message: 'Invalid session' }
      }, { status: 401 });
    }
    console.log(userInfo);

    return json({
      success: true,
      userInfo
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch';
    
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 500 });
  }
}
