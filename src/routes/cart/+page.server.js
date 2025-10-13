import { redirect } from "@sveltejs/kit";
import { sanitizeUserForFrontend, getUserCoinsAndStellarships } from '$lib/server/auth.js';

export async function load({ locals }) {
  if (!locals.user) {
    throw redirect(302, '/');
  }

  // Get user currency data
  const currency = await getUserCoinsAndStellarships(locals.user.recId);
  
  // Combine user data with currency
  const userWithCurrency = {
    ...locals.user,
    ...currency
  };

  return {
    user: sanitizeUserForFrontend(userWithCurrency) // Sanitize user data before sending to frontend
  };
}
