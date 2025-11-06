import { redirect } from "@sveltejs/kit";
import { sanitizeUserForFrontend } from '$lib/server/auth.js';

export async function load({ locals }) {
  if (!locals.user) {
    throw redirect(302, '/');
  }

  // Get referral count directly from the user's referrals field
  const referralCount = locals.user.referrals || 0;

  return {
    user: sanitizeUserForFrontend(locals.user),
    referralCount
  };
}


