import { error, redirect } from '@sveltejs/kit';
import { sanitizeUserForFrontend } from '$lib/server/auth';
import { getBlackholeReviewById } from '$lib/server/review.js';

export async function load({ locals, cookies, params }) {
  if (!locals.user) throw redirect(302, '/');

  const authorized = cookies.get('reviewer_auth') === '1';
  if (!authorized) {
    throw redirect(302, '/reviewer');
  }

  const id = params.id;
  if (!id) {
    throw error(400, 'Missing submission id');
  }

  const submission = await getBlackholeReviewById(id);
  if (!submission || submission.status !== 'pending') {
    // could still allow viewing non-pending if ya want
    throw error(404, 'Submission not found or not pending');
  }

  return {
    user: sanitizeUserForFrontend(locals.user),
    submission
  };
}
