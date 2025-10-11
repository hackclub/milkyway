import { redirect } from "@sveltejs/kit";
import { sanitizeUserForFrontend } from '$lib/server/auth.js';

export async function load({ locals }) {
  if (!locals.user) {
    throw redirect(302, '/');
  }

  return {
    user: sanitizeUserForFrontend(locals.user) // Sanitize user data before sending to frontend
  };
}
