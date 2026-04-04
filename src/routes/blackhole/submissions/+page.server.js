import { redirect, error } from '@sveltejs/kit';
import { PUBLIC_SHOW_BLACKHOLE } from '$env/static/public';
import { sanitizeUserForFrontend } from '$lib/server/auth';
import { getMyBlackholeSubmissions } from '$lib/server/blackhole.js';

export async function load({ locals }) {
  if (PUBLIC_SHOW_BLACKHOLE !== 'true') {
    throw redirect(302, '/home');
  }

  if (!locals.user) throw redirect(302, '/');

  const username = locals.user.username;
  if (!username) {
    throw error(400, 'User profile incomplete');
  }

  const submissions = await getMyBlackholeSubmissions(username);

  return {
    user: sanitizeUserForFrontend(locals.user),
    submissions
  };
}
