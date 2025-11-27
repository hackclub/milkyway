import { redirect } from '@sveltejs/kit';
import { sanitizeUserForFrontend, getReferralCountByEmail } from '$lib/server/auth.js';
import { base } from '$lib/server/db.js';
import { escapeAirtableFormula } from '$lib/server/security.js';

export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	// Get referral count for this user
	const referralCount = await getReferralCountByEmail(locals.user.email);

	// Get claimed rewards for this user
	/** @type {string[]} */
	let claimedItems = [];
	try {
		const escapedEmail = escapeAirtableFormula(locals.user.email);
		const records = await base('Referral Rewards')
			.select({
				filterByFormula: `{email} = "${escapedEmail}"`
			})
			.firstPage();
		claimedItems = records.map((record) => String(record.fields.item || ''));
	} catch (error) {
		console.error('Error fetching claimed rewards:', error);
	}

	return {
		user: sanitizeUserForFrontend(locals.user),
		referralCount,
		claimedItems
	};
}
