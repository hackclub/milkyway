import { json } from '@sveltejs/kit';
import { getUserNotifications } from '$lib/server/notifications.js';

export async function GET({ locals }) {
	if (!locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}
	try {
		const notifications = await getUserNotifications(locals.user.recId);
		return json({ notifications });
	} catch (error) {
		console.error('Error fetching notifications:', error);
		return json({ error: 'Failed to fetch notifications' }, { status: 500 });
	}
}
