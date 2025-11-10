

import { json } from '@sveltejs/kit';
import { getListOfShopVotingItems } from '$lib/server/shop.js';

export async function GET() {
  try {
    const shopItems = await getListOfShopVotingItems();
    return json({
      success: true,
      shopItems
    });
  } catch (err) {
    console.error('Airtable error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to get shop items';
    
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 500 });
  }
}
