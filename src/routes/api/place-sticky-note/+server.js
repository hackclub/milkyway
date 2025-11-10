import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { escapeAirtableFormula } from '$lib/server/security.js';
import { notifyUser } from '$lib/server/notifications.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
	try {
		if (!locals.user) {
			return json({ success: false, error: 'Not authenticated. Please log in to place sticky notes.' }, { status: 401 });
		}

		const { targetUsername, x, y, flipped } = await request.json();

		if (!targetUsername) {
			return json({ success: false, error: 'Target username required' }, { status: 400 });
		}

		// Prevent placing sticky notes on your own room
		if (targetUsername === locals.user.username) {
			return json(
				{ success: false, error: 'You cannot place sticky notes on your own room!' },
				{ status: 403 }
			);
		}

		// Get target user's record ID
		const escapedUsername = escapeAirtableFormula(targetUsername);
		const targetUserRecords = await base('User')
			.select({
				filterByFormula: `{username} = "${escapedUsername}"`,
				maxRecords: 1
			})
			.firstPage();

		if (targetUserRecords.length === 0) {
			return json({ success: false, error: 'Target user not found' }, { status: 404 });
		}

		const targetUserRecId = targetUserRecords[0].id;

		// Create sticky note furniture item for the target user
		const position = `${Math.round(x)},${Math.round(y)},${flipped ? '1' : '0'}`;

		const initialData = JSON.stringify({
			message: '',
			author: locals.user.recId,
			authorUsername: locals.user.username,
			timestamp: Date.now()
		});

		const record = await base('Furniture').create({
			user: [targetUserRecId],
			type: 'sticky_note',
			position: position,
			data: initialData
		});

		await notifyUser(
			targetUserRecId,
			`**${locals.user.username}** placed a sticky note in your room!`
		);

		// Parse position data
		const positionParts = position.split(',');
		const parsedX = parseFloat(positionParts[0]) || 0;
		const parsedY = parseFloat(positionParts[1]) || 0;
		const parsedFlipped = positionParts[2] === '1';

		return json({
			success: true,
			furniture: {
				id: record.id,
				type: record.fields.type,
				position: record.fields.position,
				x: parsedX,
				y: parsedY,
				data: record.fields.data,
				flipped: parsedFlipped,
				isPlaced: true,
				created: record.fields.Created
			},
			shouldOpenEditor: true
		});
	} catch (error) {
		console.error('Error placing sticky note:', error);
		return json({ success: false, error: 'Failed to place sticky note' }, { status: 500 });
	}
}
