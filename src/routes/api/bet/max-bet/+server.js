import { json } from '@sveltejs/kit';
import { calculatePast7DaysHours } from '$lib/server/betting.js';

export async function GET({ cookies, request }) {
	try {
		const sessionId = cookies.get('sessionid');
		if (!sessionId) {
			return json({ success: false, error: 'Not authenticated' }, { status: 401 });
		}

		const { getUserInfoBySessionId } = await import('$lib/server/auth.js');
		const userInfo = await getUserInfoBySessionId(sessionId);

		if (!userInfo || !userInfo.email) {
			return json({ success: false, error: 'User not found' }, { status: 404 });
		}

		// Get timezone from query params or use default
		const url = new URL(request.url);
		const timezone = url.searchParams.get('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;

		// Calculate past 7 days hours
		const hoursData = await calculatePast7DaysHours(userInfo.email);

		return json({
			success: true,
			past7DaysHours: hoursData.totalHours,
			maxBet: hoursData.maxBet,
			breakdown: {
				codeHours: hoursData.codeHours,
				artHours: hoursData.artHours
			}
		});
	} catch (error) {
		console.error('Error calculating max bet:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to calculate max bet'
			},
			{ status: 500 }
		);
	}
}
