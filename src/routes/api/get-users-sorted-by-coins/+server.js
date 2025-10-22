import { json } from '@sveltejs/kit';
import { getUsersSortedByCoins } from '$lib/server/leaderboard';

export async function GET() {
  try {
    const userList = await getUsersSortedByCoins();
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