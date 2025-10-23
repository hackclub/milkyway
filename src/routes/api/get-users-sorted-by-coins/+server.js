import { json } from '@sveltejs/kit';
import { getUsersSortedByCoins } from '$lib/server/leaderboard';

export async function GET({ url }) {
  try {
    const limitParam = url.searchParams.get('limit');
    const pageParam = url.searchParams.get('page');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const userList = await getUsersSortedByCoins(limit, page);
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