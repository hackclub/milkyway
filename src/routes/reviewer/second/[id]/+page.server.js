import { redirect, error } from '@sveltejs/kit';
import { getReviewerPermissions, getProjectForReviewById } from '$lib/server/reviewer.js';

export async function load({ locals, params }) {
  if (!locals.user) throw redirect(302, '/');

  const perms = await getReviewerPermissions(locals.user.recId);
  if (!perms.includes('Second')) throw redirect(302, '/reviewer');

  const project = await getProjectForReviewById(params.id);
  if (!project) throw error(404, 'Project not found');

  return { project };
}
