import { redirect } from "@sveltejs/kit";
import { getListOfShopItems } from '$lib/server/shop.js';

export async function load({ locals }) {
  if (!locals.user) {
    throw redirect(302, '/');
  }

  // Load shop items from Airtable
  console.log('Loading shop items');
  const shopItems = await getListOfShopItems();
  console.log('Loaded shop items:', shopItems);

  return {
    user: locals.user,
    shopItems
  };
}
