import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { escapeAirtableFormula } from '$lib/server/security.js';
import { createFurniture } from '$lib/server/furniture.js';
import { getReferralCountByEmail } from '$lib/server/auth.js';

// Define valid reward tiers with required referral counts
const REWARD_TIERS = {
	sticker: { minReferrals: 3, expectedReferrals: 3 },
	furniture: { minReferrals: 5, expectedReferrals: 5 },
	stickersheet: { minReferrals: 10, expectedReferrals: 10 },
	coins10: { minReferrals: 15, expectedReferrals: 15 },
	pin: { minReferrals: 25, expectedReferrals: 25 },
	coins30: { minReferrals: 35, expectedReferrals: 35 },
	hoodie: { minReferrals: 50, expectedReferrals: 50 }
};

/**
 * Claim a referral reward
 * POST /api/claim-referral-reward
 * Body: { item: string, referralCount: number }
 */
export async function POST({ request, locals }) {
	try {
		// SECURITY: Check if user is authenticated
		if (!locals.user) {
			return json({ error: 'Not authenticated' }, { status: 401 });
		}

		const body = await request.json();
		const item = String(body.item || '').trim();
		const referralCount = Number(body.referralCount);
		
		// SECURITY: Validate input types and format
		if (!item || typeof item !== 'string') {
			return json({ error: 'Invalid item type' }, { status: 400 });
		}

		// SECURITY: Validate item is in allowed list
		const validItems = Object.keys(REWARD_TIERS);
		if (!validItems.includes(item)) {
			return json({ error: 'Invalid item type' }, { status: 400 });
		}

		// SECURITY: Validate referral count is a positive number
		if (!referralCount || typeof referralCount !== 'number' || referralCount < 0 || !Number.isFinite(referralCount)) {
			return json({ error: 'Invalid referral count' }, { status: 400 });
		}

		const userEmail = locals.user.email;
		const escapedEmail = escapeAirtableFormula(userEmail);

		// SECURITY: Verify the user actually has enough referrals (server-side check)
		const actualReferralCount = await getReferralCountByEmail(userEmail);
		const requiredReferrals = REWARD_TIERS[item].minReferrals;
		
		if (actualReferralCount < requiredReferrals) {
			return json({ 
				error: `Insufficient referrals. You have ${actualReferralCount}, but need ${requiredReferrals}` 
			}, { status: 403 });
		}

		// SECURITY: Verify the referralCount matches the expected checkpoint
		if (referralCount !== REWARD_TIERS[item].expectedReferrals) {
			return json({ error: 'Invalid referral count for this reward' }, { status: 400 });
		}

		// SECURITY: Check if reward has already been claimed
		const existingRecords = await base('Referral Rewards')
			.select({
				filterByFormula: `AND({email} = "${escapedEmail}", {item} = "${escapeAirtableFormula(item)}")`
			})
			.firstPage();

		if (existingRecords.length > 0) {
			return json({ error: 'Reward already claimed' }, { status: 400 });
		}

		// Get user record ID for linking
		const userRecords = await base('User')
			.select({
				filterByFormula: `{email} = "${escapedEmail}"`,
				maxRecords: 1
			})
			.firstPage();

		if (userRecords.length === 0) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		const userRecordId = userRecords[0].id;

		// Handle different reward types
		let rewardDetails = null;

		if (item === 'coins10') {

			// Coins will need to be manually distributed
			rewardDetails = { coins: 10, note: 'Claim recorded - coins will be distributed manually' };
		} else if (item === 'coins30') {

			// Coins will need to be manually distributed
			rewardDetails = { coins: 30, note: 'Claim recorded - coins will be distributed manually' };
		} else if (item === 'furniture') {
			// SECURITY: Use a hardcoded, validated list of furniture types for this reward
			const FURNITURE_PACK_ITEMS = ['clock_brown', 'floor_lamp', 'teddybear', 'shelf', 'fireplace'];
			const createdFurniture = [];
			
			try {
				for (const furnitureType of FURNITURE_PACK_ITEMS) {
					// createFurniture already validates furniture types against VALID_FURNITURE_TYPES
					const furniture = await createFurniture(userRecordId, { type: furnitureType });
					createdFurniture.push(furniture);
				}
				
				rewardDetails = { furniture: createdFurniture };
			} catch (furnitureError) {
				// If furniture creation fails, log the error and return a proper error response
				console.error('Error creating furniture for referral reward:', furnitureError);
				return json({ error: 'Failed to create furniture items' }, { status: 500 });
			}
		}

		// Create the reward claim record (using escapeAirtableFormula for item value)
		await base('Referral Rewards').create([
			{
				fields: {
					email: [userRecordId], // Array of record IDs for linked field
					item: escapeAirtableFormula(item) // Sanitize the item value
				}
			}
		]);

		// SECURITY: Log the claim for audit purposes (but don't expose user email in client response)
		console.log(`Referral reward claimed: ${item} by user ${userRecordId} with ${actualReferralCount} referrals`);

		return json({ success: true, message: 'Reward claimed successfully!', rewardDetails });
	} catch (error) {
		console.error('Error claiming referral reward:', error);
		// SECURITY: Don't expose internal error details to client
		return json({ error: 'Failed to claim reward. Please try again later.' }, { status: 500 });
	}
}

