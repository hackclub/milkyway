import { sanitizeUserForFrontend, getUserCoinsAndStellarships } from '$lib/server/auth.js';

export async function load({ locals }) {
  let userData = null;
  
  // If user is logged in, get their currency data
  if (locals.user) {
    const currency = await getUserCoinsAndStellarships(locals.user.recId);
    
    // Combine user data with currency
    const userWithCurrency = {
      ...locals.user,
      ...currency
    };

    userData = sanitizeUserForFrontend(userWithCurrency);
  }

  return {
    user: userData // Will be null if not logged in
  };
}

