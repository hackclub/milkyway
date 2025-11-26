import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { escapeAirtableFormula } from '$lib/server/security.js';

// Valid reward types for validation
const VALID_REWARD_TYPES = ['sticker', 'stickersheet', 'hoodie', 'pin', 'coins10', 'coins30', 'furniture'];

/**
 * Get all claimed rewards for the current user
 * GET /api/get-claimed-rewards
 */
export async function GET({ locals }) {
	try {
		// SECURITY: Check if user is authenticated
		if (!locals.user) {
			return json({ error: 'Not authenticated' }, { status: 401 });
		}

		// SECURITY: Validate user email exists
		const userEmail = locals.user.email;
		if (!userEmail || typeof userEmail !== 'string') {
			return json({ error: 'Invalid user data' }, { status: 400 });
		}

		const escapedEmail = escapeAirtableFormula(userEmail);

		// Get all claimed rewards for this user
		const records = await base('Referral Rewards')
			.select({
				filterByFormula: `{email} = "${escapedEmail}"`
			})
			.firstPage();

		// SECURITY: Validate and sanitize the returned items
		const claimedItems = records
			.map((record) => {
				const item = String(record.fields.item || '').trim();
				// Only return valid reward types
				return VALID_REWARD_TYPES.includes(item) ? item : null;
			})
			.filter((item) => item !== null);

		return json({ claimedItems });
	} catch (error) {
		console.error('Error fetching claimed rewards:', error);
		// SECURITY: Don't expose internal error details to client
		return json({ error: 'Failed to fetch claimed rewards' }, { status: 500 });
	}
}

