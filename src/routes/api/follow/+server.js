import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { notifyUser } from '$lib/server/notifications.js';

export async function POST({ request, locals }) {
	if (!locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const { userId, action } = await request.json();

		if (!userId || !action) {
			return json({ error: 'Missing userId or action' }, { status: 400 });
		}

		if (action !== 'follow' && action !== 'unfollow') {
			return json({ error: 'Invalid action' }, { status: 400 });
		}

		// SECURITY: Validate userId format (Airtable record IDs start with 'rec')
		if (!/^rec[a-zA-Z0-9]{14}$/.test(userId)) {
			return json({ error: 'Invalid user ID format' }, { status: 400 });
		}

		const currentUserRecId = locals.user.recId;

		// SECURITY: Prevent users from following themselves
		if (userId === currentUserRecId) {
			return json({ error: 'Cannot follow yourself' }, { status: 400 });
		}

		// SECURITY: Verify the target user exists before following
		try {
			await base('User').find(userId);
		} catch {
			return json({ error: 'User not found' }, { status: 404 });
		}

		// Get current user's following list
		const userRecord = await base('User').find(currentUserRecId);
		const followingField = userRecord.fields.following;

		// Ensure currentFollowing is always an array
		/** @type {string[]} */
		const currentFollowing = Array.isArray(followingField) ? followingField : [];

		let newFollowing;
		if (action === 'follow') {
			// Add to following list if not already there
			if (!currentFollowing.includes(userId)) {
				newFollowing = [...currentFollowing, userId];
				// Notify the followed user
				await notifyUser(userId, `**${locals.user.username}** started following you!`);
			} else {
				newFollowing = currentFollowing;
			}
		} else {
			// Remove from following list
			newFollowing = currentFollowing.filter(/** @param {string} id */ (id) => id !== userId);
		}

		// Update the user record
		await base('User').update(currentUserRecId, {
			following: newFollowing
		});

		return json({
			success: true,
			isFollowing: action === 'follow'
		});
	} catch (error) {
		console.error('Error toggling follow:', error);
		return json({ error: 'Failed to update follow status' }, { status: 500 });
	}
}
