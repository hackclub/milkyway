import { base } from '$lib/server/db.js';
import { getAllQuests, getQuestById } from '$lib/data/quests.js';

/** @typedef {{ codeHours: number; artHours: number; totalHours: number }} ProjectHours */
/** @typedef {{ [projectId: string]: ProjectHours }} ProjectBreakdown */

/**
 * Fetch devlogs for a specific user using Airtable filterByFormula
 * NOTE: Adjusted to support both array and single-value user field.
 * @param {string} userId
 */
async function fetchUserDevlogs(userId) {
	// First try simple equality on linked record / single-select field
	const records = await base('Devlogs')
		.select({
			filterByFormula: `OR({user} = '${userId}', FIND('${userId}', ARRAYJOIN({user}&'', ',')))`
		})
		.all();

	if (!records || records.length === 0) {
		// Fallback: fetch all and filter in JS so quest doesn’t silently break
		const allRecords = await base('Devlogs').select().all();
		const filtered = allRecords.filter((record) => {
			const userField = record.fields.user;
			if (!userField) return false;
			if (Array.isArray(userField)) return userField.includes(userId);
			return String(userField) === userId;
		});

		return filtered;
	}

	return records;
}

/**
 * Get user devlogs, optionally using a cached array
 * @param {string} userId
 * @param {any[] | import('airtable').Records<import('airtable').FieldSet> | undefined} cachedRecords
 */
async function getUserDevlogs(userId, cachedRecords) {
	if (cachedRecords && Array.isArray(cachedRecords)) {
		return cachedRecords;
	}

	return fetchUserDevlogs(userId);
}

// Helper: check if user has at least one devlog that contributed to the streak
// with a submitted project (using the status lookup field on devlog directly)
/**
 * @param {string} userId
 * @param {any[] | import('airtable').Records<import('airtable').FieldSet> | undefined} cachedDevlogs
 */
async function getSubmittedStreakInfo(userId, cachedDevlogs) {
	const userDevlogs = await getUserDevlogs(userId, cachedDevlogs);

	const streakDaysWithSubmittedProject = new Set();
	let devlogsWithSubmittedStatus = 0;

	for (const devlog of userDevlogs) {
		// Skip devlogs that are still pending (not yet part of a shipped project)
		const hasPendingStreak = devlog.fields.pendingStreak === true;

		// Check the status field (lookup from Projects table)
		// This can be a string or array depending on how many projects the devlog is linked to
		const statusField = devlog.fields.status;
		let hasSubmittedStatus = false;

		if (statusField) {
			if (Array.isArray(statusField)) {
				// If linked to multiple projects, check if any is 'submitted'
				hasSubmittedStatus = statusField.includes('submitted');
			} else if (typeof statusField === 'string') {
				hasSubmittedStatus = statusField === 'submitted';
			}
		}

		// If this devlog has a submitted project, count it
		// (even if pendingStreak is still true due to data inconsistency)
		if (hasSubmittedStatus) {
			devlogsWithSubmittedStatus++;

			// Only count as streak day if it's not explicitly pending
			if (!hasPendingStreak) {
				const dateField =
					devlog.fields.devlogDate ||
					devlog.fields.date ||
					devlog.fields.Date ||
					devlog.fields.Created ||
					devlog.createdTime;

				if (dateField) {
					const dayKey = new Date(dateField).toISOString().slice(0, 10);
					streakDaysWithSubmittedProject.add(dayKey);
				}
			}
		}
	}

	// If we have any devlog with submitted status, consider it valid for streak quest
	const hasSubmittedProject = devlogsWithSubmittedStatus > 0;

	return {
		hasSubmittedProject,
		submittedStreakDays: streakDaysWithSubmittedProject.size
	};
}

/**
 * Calculate total approved hours for a user
 * Only counts devlogs where pendingCodeHours and pendingArtHours are 0
 * (meaning they were approved when a project shipped)
 *
 * @param {string} userId - User's record ID
 * @param {any[] | import('airtable').Records<import('airtable').FieldSet> | undefined} [cachedDevlogs] - Optional cached devlogs to avoid extra queries
 * @returns {Promise<{codeHours: number, artHours: number, totalHours: number, projectBreakdown: ProjectBreakdown}>}
 */
export async function calculateApprovedHours(userId, cachedDevlogs) {
	if (!userId || typeof userId !== 'string') {
		throw new Error('Invalid userId: must be a non-empty string');
	}

	try {
		const userRecords = await getUserDevlogs(userId, cachedDevlogs);

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

			if (projectUserIds.includes(userId)) {
				if (project.fields.status === 'submitted') {
					submittedProjectIds.add(project.id);
				}
			}
		}

		let totalApprovedCodeHours = 0;
		let totalApprovedArtHours = 0;
		/** @type {ProjectBreakdown} */
		const projectBreakdown = {};

		for (const record of userRecords) {
			const fields = record.fields;

			// Get all hours (including pending)
			const codeHours = typeof fields.codeHours === 'number' ? fields.codeHours : 0;
			const artHours = typeof fields.artHours === 'number' ? fields.artHours : 0;

			// Track hours per project (projectIds is comma-separated string)
			const projectIds = fields.projectIds;
			if (projectIds && typeof projectIds === 'string') {
				const projects = projectIds.split(',').filter((id) => id.trim());

				// Check if at least one project is submitted
				let hasSubmittedProject = false;
				for (const projectId of projects) {
					const trimmedId = projectId.trim();
					if (!trimmedId) continue;

					if (submittedProjectIds.has(trimmedId)) {
						hasSubmittedProject = true;
						break;
					}
				}

				// Only count hours if at least one project is submitted
				// When a project is submitted, all hours (including pending) are approved
				if (hasSubmittedProject) {
					const finalCodeHours = codeHours; // Use all code hours, not just approved
					const finalArtHours = artHours; // Use all art hours, not just approved

					totalApprovedCodeHours += finalCodeHours;
					totalApprovedArtHours += finalArtHours;

					for (const projectId of projects) {
						const trimmedId = projectId.trim();
						if (!trimmedId) continue;

						if (!projectBreakdown[trimmedId]) {
							projectBreakdown[trimmedId] = {
								codeHours: 0,
								artHours: 0,
								totalHours: 0
							};
						}

						// For devlogs with multiple projects, distribute hours evenly
						const projectCount = projects.length;
						const distributedCodeHours = finalCodeHours / projectCount;
						const distributedArtHours = finalArtHours / projectCount;

						projectBreakdown[trimmedId].codeHours += distributedCodeHours;
						projectBreakdown[trimmedId].artHours += distributedArtHours;
						projectBreakdown[trimmedId].totalHours += distributedCodeHours + distributedArtHours;
					}
				}
			}
		}

		return {
			codeHours: totalApprovedCodeHours,
			artHours: totalApprovedArtHours,
			totalHours: totalApprovedCodeHours + totalApprovedArtHours,
			projectBreakdown
		};
	} catch (error) {
		console.error('Error calculating approved hours:', error);
		throw error;
	}
}

/**
 * Calculate total hours for a user (including all hours, pending or not)
 * Used for progress bar visualization - shows all work done
 * @param {string} userId - User's record ID
 * @param {any[] | import('airtable').Records<import('airtable').FieldSet> | undefined} [cachedDevlogs] - Optional cached devlogs to avoid extra queries
 * @returns {Promise<{codeHours: number, artHours: number, totalHours: number, projectBreakdown: ProjectBreakdown}>}
 */
export async function calculateTotalHours(userId, cachedDevlogs) {
	if (!userId || typeof userId !== 'string') {
		throw new Error('Invalid userId: must be a non-empty string');
	}

	try {
		const userRecords = await getUserDevlogs(userId, cachedDevlogs);

		let totalCodeHours = 0;
		let totalArtHours = 0;
		/** @type {ProjectBreakdown} */
		const projectBreakdown = {};

		for (const record of userRecords) {
			const fields = record.fields;

			const codeHours = typeof fields.codeHours === 'number' ? fields.codeHours : 0;
			const artHours = typeof fields.artHours === 'number' ? fields.artHours : 0;

			// Count ALL hours from all devlogs
			totalCodeHours += codeHours;
			totalArtHours += artHours;

			// Track hours per project (projectIds is comma-separated string)
			const projectIds = fields.projectIds;
			if (projectIds && typeof projectIds === 'string') {
				const projects = projectIds.split(',').filter((id) => id.trim());

				for (const projectId of projects) {
					const trimmedId = projectId.trim();
					if (!trimmedId) continue;

					if (!projectBreakdown[trimmedId]) {
						projectBreakdown[trimmedId] = {
							codeHours: 0,
							artHours: 0,
							totalHours: 0
						};
					}

					// For devlogs with multiple projects, distribute hours evenly
					const projectCount = projects.length;
					const distributedCodeHours = codeHours / projectCount;
					const distributedArtHours = artHours / projectCount;

					projectBreakdown[trimmedId].codeHours += distributedCodeHours;
					projectBreakdown[trimmedId].artHours += distributedArtHours;
					projectBreakdown[trimmedId].totalHours += distributedCodeHours + distributedArtHours;
				}
			}
		}
		return {
			codeHours: totalCodeHours,
			artHours: totalArtHours,
			totalHours: totalCodeHours + totalArtHours,
			projectBreakdown
		};
	} catch (error) {
		console.error('Error calculating total hours:', error);
		throw error;
	}
}

/**
 * Get quest progress for a user
 * @param {string} userId - User's record ID
 * @returns {Promise<any[]>} Array of quest progress objects
 */
export async function getUserQuestProgress(userId) {
	if (!userId || typeof userId !== 'string') {
		throw new Error('Invalid userId: must be a non-empty string');
	}

	try {
		const userRecord = await base('User').find(userId);
		const streakStats = buildStreakStats(/** @type {any} */ (userRecord));

		const userDevlogs = await fetchUserDevlogs(userId);
		const approvedHours = await calculateApprovedHours(userId, /** @type {any[]} */ (userDevlogs));
		const totalHours = await calculateTotalHours(userId, /** @type {any[]} */ (userDevlogs));

		// New: compute submitted streak info once for all quests
		const { hasSubmittedProject } = await getSubmittedStreakInfo(userId, userDevlogs);

		const completedQuestsField = userRecord.fields.completedQuests;
		let completedQuests = [];
		if (completedQuestsField) {
			try {
				completedQuests =
					typeof completedQuestsField === 'string'
						? JSON.parse(completedQuestsField)
						: completedQuestsField;
				if (!Array.isArray(completedQuests)) {
					completedQuests = [];
				}
			} catch (e) {
				console.error('Error parsing completedQuests:', e);
				completedQuests = [];
			}
		}

		// Build progress for all quests
		const allQuests = getAllQuests();

		return await Promise.all(
			allQuests.map(async (quest) => {
				const effectiveStreak = quest.useRawStreak
					? streakStats.rawCurrentStreak
					: streakStats.approvedCurrentStreak;
				const effectiveMaxStreak = quest.useRawStreak
					? streakStats.rawMaxStreak
					: streakStats.approvedMaxStreak;

				const visualEffectiveStreak = streakStats.rawCurrentStreak;
				const visualEffectiveMaxStreak = streakStats.rawMaxStreak;

				let current = 0;
				let visualCurrent = 0; // For progress bar display (includes pending hours)
				let target = quest.target || 0;
				let completed = false;

				// Handle custom quests with validate function
				if (quest.type === 'custom' && typeof quest.validate === 'function') {
					// Calculate with approved hours for completion
					const stats = {
						codeHours: approvedHours.codeHours,
						artHours: approvedHours.artHours,
						totalHours: approvedHours.totalHours,
						projectBreakdown: approvedHours.projectBreakdown || {},
						currentStreak: effectiveStreak,
						maxStreak: effectiveMaxStreak,
						rawCurrentStreak: streakStats.rawCurrentStreak,
						rawMaxStreak: streakStats.rawMaxStreak,
						approvedCurrentStreak: streakStats.approvedCurrentStreak,
						approvedMaxStreak: streakStats.approvedMaxStreak,
						hasSubmittedStreakProject: hasSubmittedProject
					};
					const result = await quest.validate(stats, userId);
					completed = result.completed || false;
					current = result.current || 0;
					target = result.target || 0;

					// Calculate visual progress with total hours and raw streaks for more satisfying display
					const visualStats = {
						...stats,
						codeHours: totalHours.codeHours,
						artHours: totalHours.artHours,
						totalHours: totalHours.totalHours,
						projectBreakdown: totalHours.projectBreakdown || {},
						currentStreak: visualEffectiveStreak,
						maxStreak: visualEffectiveMaxStreak
					};
					const visualResult = await quest.validate(visualStats, userId);
					visualCurrent = visualResult.current || 0;
				} else {
					switch (quest.type) {
						case 'codeHours':
							current = approvedHours.codeHours;
							visualCurrent = totalHours.codeHours;
							break;
						case 'artHours':
							current = approvedHours.artHours;
							visualCurrent = totalHours.artHours;
							break;
						case 'totalHours':
							current = approvedHours.totalHours;
							visualCurrent = totalHours.totalHours;
							break;
						case 'streak':
							current = effectiveStreak;
							visualCurrent = visualEffectiveStreak;
							// Require at least one submitted streak day to mark completed
							completed = hasSubmittedProject && current >= target;
							break;
						case 'maxStreak':
							current = effectiveMaxStreak;
							visualCurrent = visualEffectiveMaxStreak;
							// Require at least one submitted streak day to mark completed
							completed = hasSubmittedProject && current >= target;
							break;
						default:
							current = 0;
							visualCurrent = 0;
							completed = current >= target;
					}
				}

				const isCompleted = completedQuests.includes(quest.id);
				const canClaim = !isCompleted && completed;

				const { validate: _, ...questWithoutValidate } = quest;

				// after computing completed/canClaim, before return, add debug for streak quests
				// (we keep the existing logic above this comment)

				const isStreakLike =
					quest.type === 'streak' || quest.type === 'maxStreak' || quest.id === 'tamagotchi';
				if (isStreakLike) {
				}

				return {
					...questWithoutValidate,
					current,
					visualCurrent,
					target,
					isCompleted,
					canClaim,
					progress: target > 0 ? Math.min(1, current / target) : 0,
					visualProgress: target > 0 ? Math.min(1, visualCurrent / target) : 0
				};
			})
		);
	} catch (error) {
		console.error('Error getting quest progress:', error);
		throw error;
	}
}

/**
 * Claim a quest reward
 * @param {string} userId - User's record ID
 * @param {string} questId - Quest ID to claim
 * @returns {Promise<{success: boolean, rewardField?: string, error?: string, newGrowthStage?: number}>}
 */
export async function claimQuestReward(userId, questId) {
	if (!userId || typeof userId !== 'string') {
		throw new Error('Invalid userId: must be a non-empty string');
	}
	if (!questId || typeof questId !== 'string') {
		throw new Error('Invalid questId: must be a non-empty string');
	}

	try {
		const quest = /** @type {any} */ (getQuestById(questId));
		if (!quest) {
			return { success: false, error: 'Quest not found' };
		}

		// Get user record
		const userRecord = await base('User').find(userId);
		const streakStats = buildStreakStats(/** @type {any} */ (userRecord));

		// Fetch devlogs once here to reuse in approvedHours and streak project check
		const userDevlogs = await fetchUserDevlogs(userId);
		const approvedHours = await calculateApprovedHours(userId, /** @type {any[]} */ (userDevlogs));
		const { hasSubmittedProject } = await getSubmittedStreakInfo(userId, userDevlogs);

		// Check if quest is completed
		let completed = false;

		// Handle custom quests with validate function
		if (quest.type === 'custom' && typeof quest.validate === 'function') {
			const effectiveStreak = quest.useRawStreak
				? streakStats.rawCurrentStreak
				: streakStats.approvedCurrentStreak;
			const effectiveMaxStreak = quest.useRawStreak
				? streakStats.rawMaxStreak
				: streakStats.approvedMaxStreak;

			const stats = {
				codeHours: approvedHours.codeHours,
				artHours: approvedHours.artHours,
				totalHours: approvedHours.totalHours,
				projectBreakdown: approvedHours.projectBreakdown || {},
				currentStreak: effectiveStreak,
				maxStreak: effectiveMaxStreak,
				rawCurrentStreak: streakStats.rawCurrentStreak,
				rawMaxStreak: streakStats.rawMaxStreak,
				approvedCurrentStreak: streakStats.approvedCurrentStreak,
				approvedMaxStreak: streakStats.approvedMaxStreak,
				hasSubmittedStreakProject: hasSubmittedProject
			};
			const result = await quest.validate(stats, userId);
			if (typeof result === 'object') {
				completed = result.completed || false;
			} else {
				completed = Boolean(result);
			}
		} else {
			let current = 0;
			switch (quest.type) {
				case 'codeHours':
					current = approvedHours.codeHours;
					break;
				case 'artHours':
					current = approvedHours.artHours;
					break;
				case 'totalHours':
					current = approvedHours.totalHours;
					break;
				case 'streak': {
					const effectiveStreak = quest.useRawStreak
						? streakStats.rawCurrentStreak
						: streakStats.approvedCurrentStreak;
					current = effectiveStreak;
					// require at least one submitted streak day
					completed = hasSubmittedProject && current >= (quest.target || 0);
					break;
				}
				case 'maxStreak': {
					const effectiveMaxStreak = quest.useRawStreak
						? streakStats.rawMaxStreak
						: streakStats.approvedMaxStreak;
					current = effectiveMaxStreak;
					// require at least one submitted streak day
					completed = hasSubmittedProject && current >= (quest.target || 0);
					break;
				}
				case 'impossible':
					current = 0;
					completed = false;
					break;
				default:
					current = 0;
					completed = current >= (quest.target || 0);
			}
		}

		if (!completed) {
			return { success: false, error: 'Quest requirements not met' };
		}

		// Check if already claimed
		const completedQuestsField = userRecord.fields.completedQuests;
		let completedQuests = [];
		if (completedQuestsField) {
			try {
				completedQuests =
					typeof completedQuestsField === 'string'
						? JSON.parse(completedQuestsField)
						: completedQuestsField;
				if (!Array.isArray(completedQuests)) {
					completedQuests = [];
				}
			} catch {
				completedQuests = [];
			}
		}

		if (completedQuests.includes(questId)) {
			return { success: false, error: 'Quest already claimed' };
		}

		completedQuests.push(questId);

		const userUpdateData = {
			completedQuests: JSON.stringify(completedQuests)
		};

		await base('User').update(userId, userUpdateData);

		// Get user's tamagotchi and increment its growth stage
		let newGrowthStage = 1;
		try {
			const tamagotchiRecords = await base('Tamagotchi')
				.select({
					filterByFormula: `FIND("${userId}", ARRAYJOIN({user}, ","))`,
					maxRecords: 1
				})
				.firstPage();

			if (tamagotchiRecords.length > 0) {
				const tamagotchi = tamagotchiRecords[0];
				const currentGrowthStage =
					typeof tamagotchi.fields.growthStage === 'number' ? tamagotchi.fields.growthStage : 0;
				newGrowthStage = currentGrowthStage + 1;

				const tamagotchiUpdateData = {
					growthStage: newGrowthStage
				};

				if (quest.rewardField) {
					// @ts-expect-error dynamic field name
					tamagotchiUpdateData[quest.rewardField] = true;
				}

				await base('Tamagotchi').update(tamagotchi.id, tamagotchiUpdateData);
			}
		} catch (tamagotchiError) {
			console.error('Error updating tamagotchi growth stage:', tamagotchiError);
		}

		return {
			success: true,
			rewardField: quest.rewardField,
			newGrowthStage
		};
	} catch (error) {
		console.error('Error claiming quest reward:', error);
		throw error;
	}
}

/**
 * Build streak stats for a user
 * @param {any} userRecord - User record from the database
 * @returns {{
 *  approvedCurrentStreak: number;
 *  approvedMaxStreak: number;
 *  rawCurrentStreak: number;
 *  rawMaxStreak: number;
 * }} Streak stats object
 */
function buildStreakStats(userRecord) {
	const approvedCurrentStreak = userRecord?.fields?.approvedDevlogStreak || 0;
	const approvedMaxStreak = userRecord?.fields?.approvedMaxDevlogStreak || 0;
	const rawCurrentStreak = userRecord?.fields?.devlogStreak || 0;
	const rawMaxStreak = userRecord?.fields?.maxDevlogStreak || 0;

	return {
		approvedCurrentStreak,
		approvedMaxStreak,
		rawCurrentStreak,
		rawMaxStreak
	};
}
