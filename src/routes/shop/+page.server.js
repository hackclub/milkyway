import { redirect } from "@sveltejs/kit";
import { getListOfShopItems } from '$lib/server/shop.js';

export async function load({ locals }) {
  if (!locals.user) {
    throw redirect(302, '/');
  }

  // Load shop items from Airtable
  const shopItems = await getListOfShopItems();

  return {
    user: locals.user,
    shopItems
  };
}
