import { json } from '@sveltejs/kit';
import { getUserActiveBet, calculateBetPeriodHours, determineBetStatus } from '$lib/server/betting.js';

export async function GET({ cookies, request }) {
	try {
		const sessionId = cookies.get('sessionid');
		if (!sessionId) {
			return json({ success: false, error: 'Not authenticated' }, { status: 401 });
		}

		const { getUserInfoBySessionId } = await import('$lib/server/auth.js');
		const userInfo = await getUserInfoBySessionId(sessionId);

		if (!userInfo || !userInfo.email || !userInfo.recId) {
			return json({ success: false, error: 'User not found' }, { status: 404 });
		}

		const activeBet = await getUserActiveBet(userInfo.email);

		if (!activeBet) {
			return json({ success: true, bet: null });
		}

		const betFields = activeBet.fields;
		const startDate = new Date(betFields.startDate);
		const endDate = new Date(betFields.endDate);
		const now = new Date();

		// Calculate hours worked during bet period
		const hoursData = await calculateBetPeriodHours(userInfo.email, startDate, endDate);

		// Determine current status
		const currentStatus = determineBetStatus(activeBet, hoursData.totalHours, now);

		// Update status and coinsEarned in Airtable if it changed
		// Also update expired status if bet has expired
		const { base } = await import('$lib/server/db.js');
		const updateFields = {
			hoursWorked: hoursData.totalHours
		};
		
		if (currentStatus !== betFields.status) {
			updateFields.status = currentStatus;
			
			// Calculate and store coinsEarned if bet is won
			if (currentStatus === 'won') {
				updateFields.coinsEarned = Math.round(betFields.betAmount * betFields.multiplier);
			}
		}
		
		// Always update hoursWorked, and status if it changed
		if (Object.keys(updateFields).length > 1 || updateFields.hoursWorked !== undefined) {
			await base('Bets').update(activeBet.id, updateFields);
		}

		return json({
			success: true,
			bet: {
				id: activeBet.id,
				betAmount: betFields.betAmount,
				hoursGoal: betFields.hoursGoal,
				multiplier: betFields.multiplier,
				startDate: betFields.startDate,
				endDate: betFields.endDate, // endDate also serves as claimableDate
				expiryDate: betFields.expiryDate,
				status: currentStatus,
				hoursWorked: hoursData.totalHours,
				hoursBreakdown: {
					codeHours: hoursData.codeHours,
					artHours: hoursData.artHours
				},
				coinsEarned: betFields.coinsEarned || (currentStatus === 'won' ? Math.round(betFields.betAmount * betFields.multiplier) : 0),
				attachedProject: betFields.attachedProject || null
			}
		});
	} catch (error) {
		console.error('Error getting current bet:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get current bet'
			},
			{ status: 500 }
		);
	}
}
