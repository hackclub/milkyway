import { json } from '@sveltejs/kit';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { claimQuestReward } from '$lib/server/quests.js';

export async function POST({ request, cookies }) {
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

		const { questId } = await request.json();

		if (!questId) {
			return json(
				{
					success: false,
					error: 'Quest ID is required'
				},
				{ status: 400 }
			);
		}

		// Claim the quest reward
		const result = await claimQuestReward(userInfo.recId, questId);

		if (!result.success) {
			return json(
				{
					success: false,
					error: result.error
				},
				{ status: 400 }
			);
		}

		return json({
			success: true,
			rewardField: result.rewardField,
			newGrowthStage: result.newGrowthStage
		});
	} catch (error) {
		console.error('Error claiming quest reward:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to claim quest reward';

		return json(
			{
				success: false,
				error: errorMessage
			},
			{ status: 500 }
		);
	}
}
