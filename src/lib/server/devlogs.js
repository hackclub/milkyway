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

		return devlogRecord;
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
				projects: projects,
				created: record.fields.Created
			};
		});
	} catch (error) {
		console.error('Error fetching today devlogs:', error);
		throw error;
	}
}
