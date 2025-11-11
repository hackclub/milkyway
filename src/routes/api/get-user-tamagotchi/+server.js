import { json } from '@sveltejs/kit';
import { sanitizeErrorMessage } from '$lib/server/security.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { getUserTamagotchi } from '$lib/server/tamagotchi.js';

// POST - Update user tamagotchi
export async function POST({ locals, cookies }) {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userInfo = await getUserInfoBySessionId(cookies.get('sessionid'));

		try {
			const tamagotchi = await getUserTamagotchi(userInfo.recId);
			return json({
				tamagotchi: tamagotchi ? tamagotchi.fields : null,
				success: true
			});
		} catch (clearError) {
			console.error('Failed to update tamagotchi', clearError);
		}
	} catch (error) {
		console.error('Error fetching tamagotchi:', error);
		return json(
			{
				error: sanitizeErrorMessage(/** @type {Error} */ (error), 'Failed to update tamagotchi')
			},
			{ status: 500 }
		);
	}
}
