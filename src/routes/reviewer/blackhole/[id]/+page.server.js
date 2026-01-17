import { redirect, error } from '@sveltejs/kit';
import { getReviewerPermissions, getBlackholeSubmissionById, getProjectForReviewById } from '$lib/server/reviewer.js';

export async function load({ locals, params }) {
  if (!locals.user) throw redirect(302, '/');

  const perms = await getReviewerPermissions(locals.user.recId);
  if (!perms.includes('Blackhole')) throw redirect(302, '/reviewer');

  const submission = await getBlackholeSubmissionById(params.id);
  if (!submission) throw error(404, 'Submission not found');

  let project = null;
  if (submission.Project) {
    project = await getProjectForReviewById(submission.Project);
  }

  return { submission, project };
}