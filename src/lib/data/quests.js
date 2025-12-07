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
		validate: async (stats = {}, userId) => {
			// Import dynamically to avoid circular dependency
			const { base } = await import('$lib/server/db.js');

			// Get all user devlogs and check which have submitted projects
			const submittedStreakDays = new Set();

			if (userId) {
				try {
					// Fetch all user's projects once to check submission status
					const allProjects = await base('Projects').select().all();

					const submittedProjectIds = new Set();
					for (const project of allProjects) {
						// Check if project belongs to this user
						const projectUserField = project.fields.user;
						const projectUserIds = Array.isArray(projectUserField)
							? projectUserField
							: projectUserField
								? [String(projectUserField)]
								: [];

						if (projectUserIds.includes(userId) && project.fields.status === 'submitted') {
							submittedProjectIds.add(project.id);
						}
					}

					// Fetch all user devlogs
					const allDevlogs = await base('Devlogs').select().all();
					const userDevlogs = allDevlogs.filter((record) => {
						const userIds = record.fields.user || [];
						return userIds.includes(userId);
					});

					for (const devlog of userDevlogs) {
						const hasPendingStreak = devlog.fields.pendingStreak === true;
						if (hasPendingStreak) continue;

						const projectIds = devlog.fields.projectIds;
						if (!projectIds || typeof projectIds !== 'string') continue;

						const projects = projectIds
							.split(',')
							.map((id) => id.trim())
							.filter(Boolean);

						// Check if at least one project is submitted using the pre-fetched set
						let hasSubmitted = false;
						for (const projectId of projects) {
							if (submittedProjectIds.has(projectId)) {
								hasSubmitted = true;
								break;
							}
						}

						if (hasSubmitted && devlog.fields.Created) {
							const dayKey = new Date(devlog.fields.Created).toISOString().slice(0, 10);
							submittedStreakDays.add(dayKey);
						}
					}
				} catch (error) {
					console.error('Error validating streak quest:', error);
				}
			}

			// Calculate streak from submitted days
			const sortedDays = Array.from(submittedStreakDays).sort();
			let currentStreak = 0;
			let maxStreak = 0;
			let tempStreak = 0;

			for (let i = 0; i < sortedDays.length; i++) {
				if (i === 0) {
					tempStreak = 1;
				} else {
					const prevDate = new Date(sortedDays[i - 1]);
					const currDate = new Date(sortedDays[i]);
					const daysDiff = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

					if (daysDiff === 1) {
						tempStreak++;
					} else {
						tempStreak = 1;
					}
				}

				if (tempStreak > maxStreak) {
					maxStreak = tempStreak;
				}

				// Current streak is the last streak
				if (i === sortedDays.length - 1) {
					currentStreak = tempStreak;
				}
			}

			const approvedValue = normalizedVariant === 'max' ? maxStreak : currentStreak;
			const visualValue =
				normalizedVariant === 'max' ? Number(stats.maxStreak) : Number(stats.currentStreak);

			return {
				completed: approvedValue >= target,
				current: Number.isFinite(visualValue) ? visualValue : approvedValue,
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
		target: 1,
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
