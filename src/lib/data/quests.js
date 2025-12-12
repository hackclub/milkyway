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

function createStreakQuest({ variant = 'streak', target = 0, ...quest }) {
	const normalizedVariant = variant === 'max' ? 'max' : 'streak';
	return {
		...quest,
		type: 'custom',
		target,
		validateAsync: true,
		validate: async (stats = {}) => {
			// stats are provided by the server-side quests logic and already include:
			// - currentStreak / maxStreak (effective, raw or approved depending on quest.useRawStreak)
			// - rawCurrentStreak / rawMaxStreak
			// - approvedCurrentStreak / approvedMaxStreak
			// - hasSubmittedStreakProject: at least one devlog in streak has submitted status

			const hasSubmitted = Boolean(stats.hasSubmittedStreakProject);

			// Use approved values if available (> 0), otherwise fall back to raw values
			let approvedValue;
			if (normalizedVariant === 'max') {
				const approvedMax = Number(stats.approvedMaxStreak ?? 0);
				const rawMax = Number(stats.rawMaxStreak ?? 0);
				approvedValue = approvedMax > 0 ? approvedMax : rawMax;
			} else {
				const approvedCurrent = Number(stats.approvedCurrentStreak ?? 0);
				const rawCurrent = Number(stats.rawCurrentStreak ?? 0);
				approvedValue = approvedCurrent > 0 ? approvedCurrent : rawCurrent;
			}

			return {
				completed: hasSubmitted && approvedValue >= target,
				current: approvedValue,
				target
			};
		}
	};
}

export const quests = [
	{
		id: 'steam_license',
		name: 'Work on your game for 50 hours! (more than half of them should be code)',
		description: 'Get a steam license to publish your game on steam!',
		type: 'custom',
		validate: async (stats) => {
			// projectBreakdown already contains only submitted projects thanks to calculateApprovedHours
			const projectBreakdown = stats.projectBreakdown || {};

			// find the project with the most total hours
			let maxProjectId = null;
			let maxProjectHours = 0;
			let maxProjectArtHours = 0;

			for (const [projectId, hours] of Object.entries(projectBreakdown)) {
				if (hours.totalHours > maxProjectHours) {
					maxProjectId = projectId;
					maxProjectHours = hours.totalHours;
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
	createStreakQuest({
		id: 'tamagotchi',
		name: 'Keep your streak alive for two weeks!',
		description: 'Get an irl tamagotchi!',
		variant: 'max',
		target: 14,
		rewardField: 'tamagotchiCompleted'
	})
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
