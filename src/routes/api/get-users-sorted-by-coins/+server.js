import { json } from '@sveltejs/kit';
import { getUsersSortedByCoins } from '$lib/server/leaderboard';
import { checkRateLimit, getClientIdentifier } from '$lib/server/security.js';

export async function GET({ url, request, cookies }) {
  try {
    // Rate limiting: 30 requests per minute per client to prevent mass scraping
    const clientId = getClientIdentifier(request, cookies);
    if (!checkRateLimit(`leaderboard:${clientId}`, 30, 60000)) {
      return json({
        success: false,
        error: 'Too many requests. Please try again later.'
      }, { status: 429 });
    }

    const limitParam = url.searchParams.get('limit');
    const pageParam = url.searchParams.get('page');
    const sortParam = url.searchParams.get('sort');
    
    // Validate and cap limit to prevent excessive data requests
    let limit = limitParam ? parseInt(limitParam, 10) : 100;
    if (isNaN(limit) || limit < 1) limit = 100;
    if (limit > 100) limit = 100; // Cap at 100 to prevent mass scraping
    
    let page = pageParam ? parseInt(pageParam, 10) : 1;
    if (isNaN(page) || page < 1) page = 1;
    
    const sortBy = sortParam === 'hours' ? 'hours' : 'coins';
    const userList = await getUsersSortedByCoins(limit, page, sortBy);
    
    return json({
      success: true,
      userList
    });
  } catch (err) {
    console.error('Airtable error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to get leaderboard';
    
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 500 });
  }
}