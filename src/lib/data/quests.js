/**
 *
 * quest types:
 * - 'codeHours': Total approved code hours
 * - 'artHours': Total approved art hours
 * - 'totalHours': Total approved hours (code + art)
 * - 'streak': Current consecutive devlog streak
 * - 'maxStreak': Maximum devlog streak achieved
 * - 'custom': Custom validation function (use validate function)
 *
 */

export const quests = [
	{
		id: 'steam_license',
		name: 'Work on your game for 50 hours! (more than half of them should be code)',
		description: 'Get a steam license to publish your game on steam!',
		type: 'custom',
		validate: (stats) => {
			const projectBreakdown = stats.projectBreakdown || {};

			// find the project with the most total hours
			let maxProjectId = null;
			let maxProjectHours = 0;
			let maxProjectCodeHours = 0;
			let maxProjectArtHours = 0;

			for (const [projectId, hours] of Object.entries(projectBreakdown)) {
				if (hours.totalHours > maxProjectHours) {
					maxProjectId = projectId;
					maxProjectHours = hours.totalHours;
					maxProjectCodeHours = hours.codeHours;
					maxProjectArtHours = hours.artHours;
				}
			}

			// check if the single project with most hours meets the requirements
			const singleProjectMeetsRequirements =
				maxProjectHours >= 50 && maxProjectArtHours <= maxProjectHours / 2;

			return {
				completed: singleProjectMeetsRequirements,
				current: maxProjectHours,
				target: 50,
				projectId: maxProjectId
			};
		},
		rewardField: 'metroidvaniaMonthCompleted'
	},
	{
		id: 'tamagotchi',
		name: 'Keep your streak alive for two weeks!',
		description: 'Get an irl tamagotchi!',
		type: 'streak',
		target: 14,
		rewardField: 'tamagotchiCompleted'
	}
];

/**
 * Get quest by ID
 * @param {string} questId
 * @returns {object|null}
 */
export function getQuestById(questId) {
	return quests.find((q) => q.id === questId) || null;
}

/**
 * Get all quests
 * @returns {Array}
 */
export function getAllQuests() {
	return quests;
}
