import { json } from '@sveltejs/kit';
import { getUserCurrency } from '$lib/server/shop.js';
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

    // Get user currency
    const currency = await getUserCurrency(userInfo.recId);

    return json({
      success: true,
      currency
    });

  } catch (error) {
    console.error('Currency fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch currency';
    
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 500 });
  }
}
