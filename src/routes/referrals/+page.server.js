import { redirect } from '@sveltejs/kit';
import { sanitizeUserForFrontend, getReferralCountByEmail, getReferralRewardsByEmail } from '$lib/server/auth.js';

export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	// Get referral count for this user
	const referralCount = await getReferralCountByEmail(locals.user.email);
	const referralRewards = await getReferralRewardsByEmail(locals.user.email);
	return {
		user: sanitizeUserForFrontend(locals.user),
		referralCount,
		referralRewards
	};
}
