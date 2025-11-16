import { json } from '@sveltejs/kit';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { getUserQuestProgress } from '$lib/server/quests.js';

export async function GET({ cookies }) {
	try {
		// Get user info from session
		const sessionId = cookies.get('sessionid');
		const userInfo = await getUserInfoBySessionId(sessionId || '');

		if (!userInfo) {
			return json(
				{
					success: false,
					error: 'Authentication required'
				},
				{ status: 401 }
			);
		}

		// Get quest progress
		const questProgress = await getUserQuestProgress(userInfo.recId);

		return json({
			success: true,
			quests: questProgress
		});
	} catch (error) {
		console.error('Error fetching quest progress:', error);
		const errorMessage = error ? error.message : 'Failed to fetch quest progress';

		return json(
			{
				success: false,
				error: errorMessage
			},
			{ status: 500 }
		);
	}
}
