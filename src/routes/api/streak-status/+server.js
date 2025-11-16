import { json } from '@sveltejs/kit';
import { getStreakStatus } from '$lib/server/devlogs.js';

export async function GET({ locals }) {
	try {
		if (!locals.user) {
			return json({ error: 'Non authenticated' }, { status: 401 });
		}

		const streakStatus = await getStreakStatus(locals.user.recId);

		return json({
			success: true,
			...streakStatus
		});
	} catch (error) {
		console.error('Error getting streak status:', error);
		return json(
			{
				error: 'Failed to get streak status'
			},
			{ status: 500 }
		);
	}
}
