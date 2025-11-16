import { json } from '@sveltejs/kit';
import { sanitizeErrorMessage } from '$lib/server/security.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { createTamagotchi } from '$lib/server/tamagotchi.js';

// POST - Create user tamagotchi
export async function POST({ locals, cookies }) {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userInfo = await getUserInfoBySessionId(cookies.get('sessionid'));
		try {
			const tamagotchi = await createTamagotchi(userInfo.recId);
			const fields = tamagotchi[0]?.fields || tamagotchi.fields;
			return json({
				tamagotchi: fields
			});
		} catch (clearError) {
			console.error('Failed to create tamagotchi', clearError);
			return json({ error: 'Failed to create tamagotchi' }, { status: 500 });
		}
	} catch (error) {
		console.error('Error creating tamagotchi:', error);
		return json(
			{
				error: sanitizeErrorMessage(/** @type {Error} */ (error), 'Failed to create tamagotchi')
			},
			{ status: 500 }
		);
	}
}
