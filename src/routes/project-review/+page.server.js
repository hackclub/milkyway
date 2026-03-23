import { error, redirect } from '@sveltejs/kit';
import { sanitizeUserForFrontend } from '$lib/server/auth.js';

/**
 * @param {any} user
 */
function userHasProjectReviewerPermission(user) {
	const perms = user?.permissions;
	if (Array.isArray(perms)) return perms.includes('project reviewer');
	if (typeof perms === 'string') {
		return perms
			.split(',')
			.map((p) => p.trim())
			.includes('project reviewer');
	}
	return false;
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(302, '/');
	}
	if (!userHasProjectReviewerPermission(locals.user)) {
		throw error(403, 'Not authorized to review projects');
	}
	return {
		user: sanitizeUserForFrontend(locals.user)
	};
}
