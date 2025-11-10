import { json } from '@sveltejs/kit';
import { markNotificationsAsRead } from '$lib/server/notifications.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';

export async function POST({ request, locals, cookies }) {
	try {
		if (!locals.user) {
			return json({ error: 'Not authenticated' }, { status: 401 });
		}

		const { notificationIds } = await request.json();

		const sessionId = cookies.get('sessionid');

		const userInfo = await getUserInfoBySessionId(sessionId);

		if (!Array.isArray(notificationIds)) {
			return json({ error: 'Invalid notificationIds: must be an array of IDs' }, { status: 400 });
		}

		try {
			await markNotificationsAsRead(userInfo.recId, notificationIds);
			return json(`Successfully marked ${notificationIds} as read`);
		} catch (error) {
			console.error('Error marking notifications as read:', error);
			return json({ error: 'Failed to mark notifications as read' }, { status: 500 });
		}
	} catch (e) {
		console.error('Error fetching notifications:', e);
		return json({ error: 'Failed to fetch notifications' }, { status: 500 });
	}
}
