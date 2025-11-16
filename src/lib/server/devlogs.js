import { base } from '$lib/server/db.js';
import { uploadImageAttachment } from '$lib/server/attachments.js';

export async function createDevlog(userId, devlogData) {
	if (!userId || typeof userId !== 'string') {
		throw new Error('Invalid userId: must be a non-empty string');
	}
	if (!devlogData || typeof devlogData !== 'object') {
		throw new Error('Invalid devlogData: must be a non-empty object');
	}
	if (!devlogData.title || typeof devlogData.title !== 'string' || !devlogData.title.trim()) {
		throw new Error('Title is required');
	}
	if (!devlogData.content || typeof devlogData.content !== 'string' || !devlogData.content.trim()) {
		throw new Error('Content is required');
	}
	if (
		!devlogData.projects ||
		!Array.isArray(devlogData.projects) ||
		devlogData.projects.length === 0
	) {
		throw new Error('At least one project is required');
	}
	// attachments can be images or videos
	if (!devlogData.photos || !Array.isArray(devlogData.photos) || devlogData.photos.length === 0) {
		throw new Error('At least one attachment (photo or video) is required');
	}
	try {
		const fields = {
			user: [userId],
			title: devlogData.title,
			content: devlogData.content
		};

		if (devlogData.hours !== undefined && typeof devlogData.hours === 'number') {
			fields.hours = devlogData.hours;
		}

		if (devlogData.codeHours !== undefined && typeof devlogData.codeHours === 'number') {
			fields.codeHours = devlogData.codeHours;
			fields.pendingCodeHours = devlogData.codeHours; // Initially all code hours are pending
		}

		if (devlogData.artHours !== undefined && typeof devlogData.artHours === 'number') {
			fields.artHours = devlogData.artHours;
			fields.pendingArtHours = devlogData.artHours; // Initially all art hours are pending
		}

		// projects get stored as comma-separated string of ids
		if (
			devlogData.projects &&
			Array.isArray(devlogData.projects) &&
			devlogData.projects.length > 0
		) {
			fields.projectIds = devlogData.projects.join(',');
		}

		const createdRecords = await base('Devlogs').create([
			{
				fields: fields
			}
		]);

		const devlogRecord = createdRecords[0];

		// array of base64 attachments (image or video)
		if (devlogData.photos && Array.isArray(devlogData.photos) && devlogData.photos.length > 0) {
			for (let i = 0; i < devlogData.photos.length; i++) {
				const file = devlogData.photos[i];
				const filename = file.filename || `devlog-file-${i + 1}-${Date.now()}`;
				const contentType = file.contentType || 'application/octet-stream';

				await uploadImageAttachment(
					devlogRecord.id,
					'attachments',
					file.data,
					filename,
					contentType
				);
			}
		}

		let streakInfo = null;
		try {
			const todayDevlogs = await getTodayDevlogs(userId);
			const codeHoursThisDevlog = devlogData.codeHours || 0;
			const artHoursThisDevlog = devlogData.artHours || 0;

			let totalCodeHoursToday = codeHoursThisDevlog;
			let totalArtHoursToday = artHoursThisDevlog;
			for (const devlog of todayDevlogs) {
				totalCodeHoursToday += devlog.codeHours;
				totalArtHoursToday += devlog.artHours;
			}

			if (totalCodeHoursToday + totalArtHoursToday >= 1) {
				streakInfo = await updateStreak(userId);
				if (streakInfo && streakInfo.isNewStreak && !streakInfo.alreadyPostedToday) {
					await base('Devlogs').update(devlogRecord.id, {
						pendingStreak: true,
						streakValue: streakInfo.streak,
						streakContinued: streakInfo.isStreakContinued || false
					});
				}
			}
		} catch (streakError) {
			console.error('Failed to update streak:', streakError);
		}

		return {
			devlog: devlogRecord,
			streak: streakInfo
		};
	} catch (error) {
		console.error('Error creating devlog:', error);
		throw error;
	}
}

/* currently not used and out of sync with the rest of the codebase
export async function updateDevlog(devlogId, devlogData) {
	if (!devlogId || typeof devlogId !== 'string') {
		throw new Error('Invalid devlogId: must be a non-empty string');
	}
	if (!devlogData || typeof devlogData !== 'object') {
		throw new Error('Invalid devlogData: must be a non-empty object');
	}
	try {
		const fields = {};

		// Only update fields that are provided
		if (devlogData.title !== undefined) {
			fields.title = devlogData.title;
		}
		if (devlogData.content !== undefined) {
			fields.content = devlogData.content;
		}

		const updatedRecords = await base('Devlogs').update([
			{
				id: devlogId,
				fields: fields
			}
		]);

		const devlogRecord = updatedRecords[0];

		// upload new photos if provided
		if (devlogData.photos && Array.isArray(devlogData.photos) && devlogData.photos.length > 0) {
			// Clear existing attachments first if needed
			if (devlogData.clearExistingPhotos) {
				await base('Devlogs').update(devlogId, {
					attachments: []
				});
			}

			// upload new photos
			for (let i = 0; i < devlogData.photos.length; i++) {
				const photo = devlogData.photos[i];
				const filename = photo.filename || `devlog-photo-${i + 1}-${Date.now()}.jpg`;
				const contentType = photo.contentType || 'image/jpeg';

				await uploadImageAttachment(devlogId, 'attachments', photo.data, filename, contentType);
			}
		}

		return devlogRecord;
	} catch (error) {
		console.error('Error updating devlog:', error);
		throw error;
	}
}

export async function deleteDevlog(devlogId) {
	if (!devlogId || typeof devlogId !== 'string') {
		throw new Error('Invalid devlogId: must be a non-empty string');
	}
	try {
		return await base('Devlogs').destroy([devlogId]);
	} catch (error) {
		console.error('Error deleting devlog:', error);
		throw error;
	}
}
*/

/**
 * Get devlogs created today for a user
 * Used to calculate already claimed hours per project
 * @param {string} userId - User's record ID
 * @returns {Promise<Array>} Array of today's devlogs
 */
export async function getTodayDevlogs(userId) {
	if (!userId || typeof userId !== 'string') {
		throw new Error('Invalid userId: must be a non-empty string');
	}

	try {
		// get today's date range
		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const todayStartISO = todayStart.toISOString();

		// fetch every recent devlogs and filter in memory
		const allRecords = await base('Devlogs')
			.select({
				filterByFormula: `IS_AFTER({Created}, "${todayStartISO}")`
			})
			.all();

		// filter in memory for this user
		const records = allRecords.filter((record) => {
			const userIds = record.fields.user || [];
			return userIds.includes(userId);
		});

		return records.map((record) => {
			const projectIds = record.fields.projectIds;
			const projects =
				typeof projectIds === 'string' ? projectIds.split(',').filter((id) => id.trim()) : [];

			return {
				id: record.id,
				hours: typeof record.fields.hours === 'number' ? record.fields.hours : 0,
				codeHours: typeof record.fields.codeHours === 'number' ? record.fields.codeHours : 0,
				artHours: typeof record.fields.artHours === 'number' ? record.fields.artHours : 0,
				projects: projects,
				created: record.fields.Created
			};
		});
	} catch (error) {
		console.error('Error fetching today devlogs:', error);
		throw error;
	}
}

/**
 * Update user's devlog streak
 * Increments streak if they posted yesterday, resets to 1 if streak was broken
 * @param {string} userId - User's record ID
 * @returns {Promise<Object>} Updated streak info
 */
export async function updateStreak(userId) {
	if (!userId || typeof userId !== 'string') {
		throw new Error('Invalid userId: must be a non-empty string');
	}

	try {
		const userRec = await base('User').find(userId);
		if (!userRec) {
			throw new Error('User not found');
		}

		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		// Get current streak data
		const currentStreak = userRec.fields.devlogStreak || 0;
		const lastDevlogDate = userRec.fields.lastDevlogDate
			? new Date(userRec.fields.lastDevlogDate)
			: null;

		let newStreak = 1;
		let isStreakContinued = false;

		if (lastDevlogDate) {
			const lastDevlogStart = new Date(
				lastDevlogDate.getFullYear(),
				lastDevlogDate.getMonth(),
				lastDevlogDate.getDate()
			);

			const daysDiff = Math.floor((todayStart - lastDevlogStart) / (1000 * 60 * 60 * 24));

			if (daysDiff === 0) {
				// already posted today, don't update streak
				return {
					streak: currentStreak,
					isNewStreak: false,
					alreadyPostedToday: true
				};
			} else if (daysDiff === 1) {
				// posted yesterday, continue the streak
				newStreak = currentStreak + 1;
				isStreakContinued = true;
			} else {
				// streak broken, reset to 1
				newStreak = 1;
				isStreakContinued = false;
			}
		}

		// Update max streak if new streak is higher
		const updateData = {
			devlogStreak: newStreak,
			lastDevlogDate: now.toISOString()
		};

		const currentMaxStreak = userRec.fields.maxDevlogStreak || 0;
		if (newStreak > currentMaxStreak) {
			updateData.maxDevlogStreak = newStreak;
		}

		await base('User').update(userId, updateData);

		return {
			streak: newStreak,
			isNewStreak: true,
			isStreakContinued: isStreakContinued,
			previousStreak: currentStreak
		};
	} catch (error) {
		console.error('Error updating streak:', error);
		throw error;
	}
}

/**
 * Check if streak is expired and reset it if necessary
 * @param {string} userId - User's record ID
 * @returns {Promise<number>} Current valid streak count
 */
export async function checkAndResetExpiredStreak(userId) {
	if (!userId || typeof userId !== 'string') {
		throw new Error('Invalid userId: must be a non-empty string');
	}

	try {
		const userRec = await base('User').find(userId);
		if (!userRec) {
			throw new Error('User not found');
		}

		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		const currentStreak = userRec.fields.devlogStreak || 0;
		const lastDevlogDate = userRec.fields.lastDevlogDate
			? new Date(userRec.fields.lastDevlogDate)
			: null;

		// If no streak or no last devlog date, return 0
		if (currentStreak === 0 || !lastDevlogDate) {
			return 0;
		}

		const lastDevlogStart = new Date(
			lastDevlogDate.getFullYear(),
			lastDevlogDate.getMonth(),
			lastDevlogDate.getDate()
		);

		const daysDiff = Math.floor((todayStart - lastDevlogStart) / (1000 * 60 * 60 * 24));

		// If more than 1 day has passed, streak is broken - reset it to 0
		if (daysDiff > 1) {
			await base('User').update(userId, {
				devlogStreak: 0
			});
			return 0;
		}

		return currentStreak;
	} catch (error) {
		console.error('Error checking/resetting expired streak:', error);
		throw error;
	}
}

/**
 * Get user's current streak status
 * @param {string} userId - User's record ID
 * @returns {Promise<Object>} Streak status info
 */
export async function getStreakStatus(userId) {
	if (!userId || typeof userId !== 'string') {
		throw new Error('Invalid userId: must be a non-empty string');
	}

	try {
		const userRec = await base('User').find(userId);
		if (!userRec) {
			throw new Error('User not found');
		}

		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		const currentStreak = userRec.fields.devlogStreak || 0;
		const lastDevlogDate = userRec.fields.lastDevlogDate
			? new Date(userRec.fields.lastDevlogDate)
			: null;

		let hasPostedToday = false;
		let isStreakAtRisk = false;

		if (lastDevlogDate) {
			const lastDevlogStart = new Date(
				lastDevlogDate.getFullYear(),
				lastDevlogDate.getMonth(),
				lastDevlogDate.getDate()
			);

			const daysDiff = Math.floor((todayStart - lastDevlogStart) / (1000 * 60 * 60 * 24));

			if (daysDiff === 0) {
				// Posted today
				hasPostedToday = true;
				isStreakAtRisk = false;
			} else if (daysDiff === 1) {
				// Posted yesterday, haven't posted today yet - streak at risk!
				hasPostedToday = false;
				isStreakAtRisk = true;
			} else {
				// Streak already broken
				hasPostedToday = false;
				isStreakAtRisk = false;
			}
		}

		return {
			currentStreak,
			hasPostedToday,
			isStreakAtRisk,
			lastDevlogDate: lastDevlogDate ? lastDevlogDate.toISOString() : null
		};
	} catch (error) {
		console.error('Error getting streak status:', error);
		throw error;
	}
}
