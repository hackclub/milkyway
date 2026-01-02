import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { escapeAirtableFormula } from '$lib/server/security.js';
import { calculatePast7DaysHours, getUserActiveBet } from '$lib/server/betting.js';

export async function POST({ request, cookies }) {
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

		const { betAmount, hoursGoal, timezone } = await request.json();

		// Validate inputs
		if (!betAmount || typeof betAmount !== 'number' || betAmount < 1 || !Number.isInteger(betAmount)) {
			return json({ success: false, error: 'Invalid bet amount (must be a positive integer)' }, { status: 400 });
		}

		if (![5, 10, 25].includes(hoursGoal)) {
			return json({ success: false, error: 'Invalid hours goal' }, { status: 400 });
		}

		// Check if user has an active bet
		const activeBet = await getUserActiveBet(userInfo.email);
		if (activeBet) {
			return json({ success: false, error: 'You already have an active bet' }, { status: 400 });
		}

		// Calculate past 7 days hours to determine max bet
		const hoursData = await calculatePast7DaysHours(userInfo.email);
		const maxBet = hoursData.maxBet;

		if (maxBet < 1) {
			return json(
				{
					success: false,
					error: `You need at least 0.2 hours in the past 7 days to place a bet (you have ${hoursData.totalHours.toFixed(1)} hours)`
				},
				{ status: 400 }
			);
		}

		if (betAmount > maxBet) {
			return json(
				{
					success: false,
					error: `Maximum bet is ${maxBet} coins (5 × ${hoursData.totalHours.toFixed(1)} hours in past 7 days)`
				},
				{ status: 400 }
			);
		}

		// Check if user has enough coins
		const usersTable = base('User');
		const userRecord = await usersTable.find(userInfo.recId);
		const currentCoins = typeof userRecord.fields.coins === 'number' ? userRecord.fields.coins : 0;

		if (betAmount > currentCoins) {
			return json({ success: false, error: 'Insufficient coins' }, { status: 400 });
		}

		// Calculate multiplier
		const multiplier = hoursGoal === 5 ? 1.1 : hoursGoal === 10 ? 1.22 : 1.4;

		// Calculate dates (all with time and timezone)
		const now = new Date();
		const startDate = new Date(now);
		
		const endDate = new Date(startDate);
		endDate.setDate(endDate.getDate() + 7); // 7 days after startDate, same time

		const expiryDate = new Date(endDate);
		expiryDate.setDate(expiryDate.getDate() + 1); // 1 day after endDate (24 hours to claim)

		// Create bet record FIRST (before deducting coins) to avoid race condition
		const betsTable = base('Bets');
		let betRecord;
		try {
			betRecord = await betsTable.create({
				user: [userInfo.recId],
				betAmount: betAmount,
				hoursGoal: hoursGoal,
				multiplier: multiplier,
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
				expiryDate: expiryDate.toISOString(),
				status: 'active',
				past7DaysHours: hoursData.totalHours,
				maxBetAmount: maxBet
			});
		} catch (betCreateError) {
			console.error('Error creating bet record:', betCreateError);
			return json(
				{
					success: false,
					error: 'Failed to create bet. Please try again.'
				},
				{ status: 500 }
			);
		}

		// Deduct coins from user AFTER bet is created
		try {
			await usersTable.update(userInfo.recId, {
				coins: currentCoins - betAmount
			});
		} catch (coinUpdateError) {
			console.error('Error deducting coins after bet creation:', coinUpdateError);
			// Try to delete the bet record if coin deduction fails
			try {
				await betsTable.destroy(betRecord.id);
			} catch (deleteError) {
				console.error('Error deleting bet record after coin deduction failure:', deleteError);
			}
			return json(
				{
					success: false,
					error: 'Failed to deduct coins. Please try again.'
				},
				{ status: 500 }
			);
		}

		return json({
			success: true,
			bet: {
				id: betRecord.id,
				betAmount,
				hoursGoal,
				multiplier,
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
				expiryDate: expiryDate.toISOString(),
				status: 'active'
			}
		});
	} catch (error) {
		console.error('Error placing bet:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to place bet'
			},
			{ status: 500 }
		);
	}
}
