import { base } from '$lib/server/db.js';

/**
 * Send a notification to a user
 * @param {string} userId - The user's record ID
 * @param {string} message - The notification message (supports **bold**, *italic* and ~~strikethrough~~ text)
 * @returns {Promise<void>}
 */
export async function notifyUser(userId, message) {
	if (!userId || typeof userId !== 'string') {
		throw new Error('Invalid userId: must be a non-empty string');
	}
	if (!message || typeof message !== 'string') {
		throw new Error('Invalid message: must be a non-empty string');
	}

	try {
		const userRecord = await base('User').find(userId);
		let existingNotifications = [];
		if (userRecord.fields.notifications) {
			try {
				existingNotifications = JSON.parse(userRecord.fields.notifications);
				if (!Array.isArray(existingNotifications)) {
					existingNotifications = [];
				}
			} catch (parseError) {
				console.warn('Failed to parse notifications JSON, resetting to empty array:', parseError);
				existingNotifications = [];
			}
		}

		let nextId = 1;
		if (existingNotifications.length > 0) {
			const ids = existingNotifications.map((n) => n.id || 0);
			const maxId = Math.max(...ids);
			nextId = maxId + 1;
		}

		// Limit to last 100 notifications to prevent unbounded growth
		const newNotification = { id: nextId, message, date: new Date().toISOString() };
		const updatedNotifications = [...existingNotifications, newNotification].slice(-100);

		await base('User').update(userId, {
			notifications: JSON.stringify(updatedNotifications)
		});
	} catch (error) {
		console.error('Error sending notification:', error);
		throw error;
	}
}

export async function getUserNotifications(userId) {
	if (!userId || typeof userId !== 'string') {
		throw new Error('Invalid userId: must be a non-empty string');
	}

	try {
		const userRecord = await base('User').find(userId);
		let notifications = [];
		if (userRecord.fields.notifications) {
			try {
				notifications = JSON.parse(userRecord.fields.notifications);
			} catch (parseError) {
				console.warn('Failed to parse notifications JSON:', parseError);
				notifications = [];
			}
		}
		return Array.isArray(notifications) ? notifications : [];
	} catch (error) {
		console.error('Error fetching notifications:', error);
	}
	return [];
}

export async function markNotificationsAsRead(userId, notificationIds) {
	if (!userId || typeof userId !== 'string') {
		throw new Error('Invalid userId: must be a non-empty string');
	}
	if (!Array.isArray(notificationIds)) {
		throw new Error('Invalid notificationIds: must be an array of IDs');
	}

	try {
		const userRecord = await base('User').find(userId);
		let notifications = [];
		if (userRecord.fields.notifications) {
			try {
				notifications = JSON.parse(userRecord.fields.notifications);
			} catch (parseError) {
				console.warn('Failed to parse notifications JSON:', parseError);
				notifications = [];
			}
		}

		const updatedNotifications = notifications.filter((n) => !notificationIds.includes(n.id));

		await base('User').update(userId, {
			notifications: JSON.stringify(updatedNotifications)
		});
	} catch (error) {
		console.error('Error marking notifications as read:', error);
		throw error;
	}
}
