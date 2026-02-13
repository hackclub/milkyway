import { redirect } from '@sveltejs/kit';
import { getReviewerPermissions, getBasicReviewQueue } from '$lib/server/reviewer.js';

export async function load({ locals }) {
  if (!locals.user) throw redirect(302, '/');

  const perms = Array.isArray(locals.user.permissions)
    ? locals.user.permissions.map(String)
    : await getReviewerPermissions(locals.user.recId);

  if (!perms.includes('Basic')) throw redirect(302, '/reviewer');

  const projects = await getBasicReviewQueue();

  return { perms, projects };
}
