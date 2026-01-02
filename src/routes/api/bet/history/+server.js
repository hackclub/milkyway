import { json } from '@sveltejs/kit';
import { getUserBetHistory } from '$lib/server/betting.js';

export async function GET({ cookies }) {
	try {
		const sessionId = cookies.get('sessionid');
		if (!sessionId) {
			return json({ success: false, error: 'Not authenticated' }, { status: 401 });
		}

		const { getUserInfoBySessionId } = await import('$lib/server/auth.js');
		const userInfo = await getUserInfoBySessionId(sessionId);

		if (!userInfo || !userInfo.recId) {
			return json({ success: false, error: 'User not found' }, { status: 404 });
		}

		const bets = await getUserBetHistory(userInfo.email);

		const betHistory = bets.map(bet => ({
			id: bet.id,
			betAmount: bet.fields.betAmount,
			hoursGoal: bet.fields.hoursGoal,
			multiplier: bet.fields.multiplier,
			startDate: bet.fields.startDate,
			endDate: bet.fields.endDate,
			status: bet.fields.status,
			hoursWorked: bet.fields.hoursWorked || 0,
			coinsEarned: bet.fields.coinsEarned || 0,
			claimedDate: bet.fields.claimedDate || null
		}));

		return json({
			success: true,
			bets: betHistory
		});
	} catch (error) {
		console.error('Error getting bet history:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get bet history'
			},
			{ status: 500 }
		);
	}
}
