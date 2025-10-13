import { json } from '@sveltejs/kit';
import { getUserPurchaseHistory } from '$lib/server/shop.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';

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
    const userInfo = await getUserInfoBySessionId(sessionId);
    if (!userInfo) {
      return json({
        success: false,
        error: { message: 'Invalid session' }
      }, { status: 401 });
    }

    // Get user purchase history
    const purchases = await getUserPurchaseHistory(String(userInfo.email || ''));

    return json({
      success: true,
      purchases
    });

  } catch (error) {
    console.error('Purchase history fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch purchase history';
    
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 500 });
  }
}
