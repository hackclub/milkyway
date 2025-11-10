import { json } from '@sveltejs/kit';
import { completeVote } from '$lib/server/shop.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { checkRateLimit, getClientIdentifier } from '$lib/server/security.js';

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

    // Rate limiting: 5 purchases per minute per user
    if (!checkRateLimit(`purchase:${userInfo.email}`, 5, 60000)) {
      return json({
        success: false,
        error: { message: 'Too many purchase attempts. Please wait a moment.' }
      }, { status: 429 });
    }

    // Parse and validate request body
    const { itemId, voteAmount } = await request.json();
    if (!itemId || typeof itemId !== 'string' || itemId.length > 50) {
      return json({
        success: false,
        error: { message: 'Invalid item ID' }
      }, { status: 400 });
    }

    if (!voteAmount || typeof voteAmount !== 'number' || voteAmount <= 0 || voteAmount > 1000) {
      return json({
        success: false,
        error: { message: 'Invalid vote amount' }
      }, { status: 400 });
    }

    // Complete the purchase
    
    const result = await completeVote(userInfo.recId, String(userInfo.email || ''), itemId, voteAmount);

    // SECURITY: Only return safe item data, not full item details
    const safeItem = {
      id: result.item.id,
      name: result.item.name,
      type: result.item.type
      // Don't return pricing, description, or other sensitive details
    };

    return json({
      success: true,
      purchase: result.purchase,
      currency: result.currency,
      item: safeItem
    });

  } catch (error) {
    console.error('Purchase error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Purchase failed';
    
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 400 });
  }
}
