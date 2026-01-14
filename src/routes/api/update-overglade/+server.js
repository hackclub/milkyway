import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { sanitizeErrorMessage } from '$lib/server/security.js';

const VALID_OVERGLADE_VALUES = ['probably', 'maybe', 'probably not', 'idk'];

export async function POST({ request, cookies }) {
	try {
		const { overglade } = await request.json();
		const sessionId = cookies.get('sessionid');

		if (!sessionId) {
			return json(
				{
					success: false,
					error: 'No session found'
				},
				{ status: 401 }
			);
		}

		if (!overglade || !VALID_OVERGLADE_VALUES.includes(overglade)) {
			return json(
				{
					success: false,
					error: 'Invalid overglade value'
				},
				{ status: 400 }
			);
		}

		// Get user info from session
		const { getUserInfoBySessionId } = await import('$lib/server/auth.js');
		const user = await getUserInfoBySessionId(sessionId);

		if (!user) {
			return json(
				{
					success: false,
					error: 'User not found'
				},
				{ status: 404 }
			);
		}

		// Update user's overglade field in Airtable
		// Note: The field name in Airtable is "overglade?" but we'll use "overglade?" as the key
		await base('User').update(user.recId, {
			'overglade?': overglade
		});

		return json({
			success: true,
			message: 'Overglade status updated successfully'
		});
	} catch (err) {
		console.error('Airtable error:', err);
		const errorMessage = sanitizeErrorMessage(
			/** @type {Error} */ (err),
			'Failed to update overglade status'
		);

		return json(
			{
				success: false,
				error: errorMessage
			},
			{ status: 500 }
		);
	}
}

