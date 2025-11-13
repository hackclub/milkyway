import { json } from '@sveltejs/kit';
import { sanitizeErrorMessage } from '$lib/server/security.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { updateTamagotchi, getUserTamagotchi } from '$lib/server/tamagotchi.js';

// POST - Update user tamagotchi
export async function POST({ request, locals, cookies }) {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userInfo = await getUserInfoBySessionId(cookies.get('sessionid'));

		const { name } = await request.json();

		try {
			await updateTamagotchi(userInfo.recId, { name });
			const updatedTamagotchi = await getUserTamagotchi(userInfo.recId);
			return json({
				tamagotchi: updatedTamagotchi.fields
			});
		} catch (clearError) {
			console.error('Failed to update tamagotchi', clearError);
			return json({ error: 'Failed to update tamagotchi' }, { status: 500 });
		}
	} catch (error) {
		console.error('Error updating tamagotchi:', error);
		return json(
			{
				error: sanitizeErrorMessage(/** @type {Error} */ (error), 'Failed to update tamagotchi')
			},
			{ status: 500 }
		);
	}
}
