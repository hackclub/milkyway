import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { getUserActiveBet, calculateBetPeriodHours, determineBetStatus } from '$lib/server/betting.js';
import { verifyProjectOwnership } from '$lib/server/projects.js';

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

		const { betId, projectId } = await request.json();

		if (!betId || !projectId) {
			return json({ success: false, error: 'Bet ID and Project ID are required' }, { status: 400 });
		}

		// Get the bet
		const betsTable = base('Bets');
		const betRecord = await betsTable.find(betId);

		// Verify bet belongs to user
		const betUserField = betRecord.fields.user;
		const betUserIds = Array.isArray(betUserField) ? betUserField : betUserField ? [String(betUserField)] : [];
		if (!betUserIds.includes(userInfo.recId)) {
			return json({ success: false, error: 'Bet does not belong to user' }, { status: 403 });
		}

		// Verify project ownership
		const isOwner = await verifyProjectOwnership(projectId, userInfo.email);
		if (!isOwner) {
			return json({ success: false, error: 'Project does not belong to user' }, { status: 403 });
		}

		// Check if bet is already claimed (check first to avoid unnecessary calculations)
		if (betRecord.fields.status === 'claimed') {
			return json({ success: false, error: 'Bet already claimed' }, { status: 400 });
		}

		// Check if bet is claimable (endDate serves as claimableDate)
		const now = new Date();
		const betEndDate = new Date(betRecord.fields.endDate); // endDate is also claimableDate
		const expiryDate = new Date(betRecord.fields.expiryDate);

		if (now < betEndDate) {
			return json({ success: false, error: 'Bet is not yet claimable' }, { status: 400 });
		}

		// Calculate hours and determine status (do this before expiry check to get accurate status)
		const startDate = new Date(betRecord.fields.startDate);
		const endDate = new Date(betRecord.fields.endDate);
		const hoursData = await calculateBetPeriodHours(userInfo.email, startDate, endDate);
		const status = determineBetStatus(betRecord, hoursData.totalHours, now);

		// Check expiry after determining status (status might have changed to expired)
		if (now >= expiryDate || status === 'expired') {
			return json({ success: false, error: 'Bet has expired' }, { status: 400 });
		}

		if (status !== 'won') {
			return json({ success: false, error: 'Bet did not meet hours goal' }, { status: 400 });
		}

		// Double-check status hasn't changed (race condition protection)
		// Re-fetch bet to ensure it hasn't been claimed by another request
		const refreshedBet = await betsTable.find(betId);
		if (refreshedBet.fields.status === 'claimed') {
			return json({ success: false, error: 'Bet already claimed' }, { status: 400 });
		}
		if (refreshedBet.fields.status !== 'won' && refreshedBet.fields.status !== 'active') {
			return json({ success: false, error: `Bet status is ${refreshedBet.fields.status}, cannot claim` }, { status: 400 });
		}

		// Calculate coins earned
		const coinsEarned = Math.round(betRecord.fields.betAmount * betRecord.fields.multiplier);

		// Get the project's primary identifier (projectid field) for storing in attachedProject
		// When storing linked records, we use record IDs, but when querying we need projectid
		const projectsTable = base('Projects');
		const projectRecord = await projectsTable.find(projectId);
		const projectPrimaryId = projectRecord.fields.projectid || projectId;

		// Claim the bet (store coinsEarned in Airtable)
		// Store using record ID (as required for linked record creation)
		await betsTable.update(betId, {
			status: 'claimed',
			attachedProject: [projectId], // Store record ID (required for linked records)
			claimedDate: now.toISOString(),
			hoursWorked: hoursData.totalHours,
			coinsEarned: coinsEarned
		});

		return json({
			success: true,
			message: 'Bet claimed successfully',
			coinsEarned: coinsEarned
		});
	} catch (error) {
		console.error('Error claiming bet:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to claim bet'
			},
			{ status: 500 }
		);
	}
}
