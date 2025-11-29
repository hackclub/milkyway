import { json, error } from '@sveltejs/kit';
import { getBlackholeHistory } from '$lib/server/blackhole.js';

export async function GET({ url }) {
  const username = url.searchParams.get('username');

  if (!username){
    throw error(400, 'Missing username');
  }

  try{
    const history = await getBlackholeHistory(username);
    return json(history);
  } catch (err) {
    console.error('Blackhole history error:', err);
    throw error(500, 'Failed to fetch history');
  }
}