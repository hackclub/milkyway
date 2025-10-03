// go to airtable
// get the shop tab
// return list of shop items

import { json } from '@sveltejs/kit';
import { getListOfShopItems } from '$lib/server/shop.js';

export async function GET() {
  try {
    const shopItems = await getListOfShopItems();
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
