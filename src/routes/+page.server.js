import { sanitizeUserForFrontend } from '$lib/server/auth.js';

export async function load({ locals }) {
  return { user: sanitizeUserForFrontend(locals.user) };
}
