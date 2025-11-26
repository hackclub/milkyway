import { json } from '@sveltejs/kit';
import { completeVote, deductCurrency } from '$lib/server/shop.js';
import { getUserInfoBySessionId, giveReferralRewards } from '$lib/server/auth.js';
import { checkRateLimit, getClientIdentifier } from '$lib/server/security.js';
import { use } from 'marked';

export async function POST({ request, cookies }) {
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

    const {paintchips_cost, coins_cost} = await request.json();

    // Parse and validate request body
    //const { coins_cost, paintchips_cost } = await request.json();


    // Complete the purchase
    console.error('Giving referral rewards to user: ' + userInfo.recId);
    const costs = {
      coins_cost: Number(coins_cost),
      stellarships_cost: Number(0),
      paintchips_cost: Number(paintchips_cost)
    };
    
    await deductCurrency(userInfo.recId, costs);


    return json({
      success: true,
      message: userInfo.recId + ' Purchase successful'
    });

  } catch (error) {
    console.error('Purchase error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Purchase failed';
    
    return json({
      success: false,
      error: { message: errorMessage },
      message: errorMessage
    }, { status: 400 });
  }
}
