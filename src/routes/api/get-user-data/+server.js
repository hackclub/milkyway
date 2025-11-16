import { json } from '@sveltejs/kit';
import { getUserCoinsAndStellarships, sanitizeUserForFrontend } from '$lib/server/auth.js';
import { getUserFurnitureByEmail } from '$lib/server/furniture.js';
import { getUserProjectsByEmail } from '$lib/server/projects.js';
import { checkAndResetExpiredStreak } from '$lib/server/devlogs.js';

export async function GET({ locals }) {
	try {
		if (!locals.user) {
			return json({ success: false, error: 'Not authenticated' }, { status: 401 });
		}

		// check and reset streak if it has expired (more than 1 day since last devlog)
		let currentStreak = locals.user.devlogStreak || 0;
		try {
			currentStreak = await checkAndResetExpiredStreak(locals.user.recId);
		} catch (error) {}

		// Get updated coins, stellarships, paintchips
		const { coins, stellarships, paintchips } = await getUserCoinsAndStellarships(
			locals.user.recId
		);

		// Get updated furniture list
		const furniture = await getUserFurnitureByEmail(locals.user.email);

		// Get updated projects list
		const projects = await getUserProjectsByEmail(locals.user.email);

		// check if user has posted today
		const lastDevlogDate = locals.user.lastDevlogDate ? new Date(locals.user.lastDevlogDate) : null;
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const hasPostedToday = lastDevlogDate
			? new Date(
					lastDevlogDate.getFullYear(),
					lastDevlogDate.getMonth(),
					lastDevlogDate.getDate()
				).getTime() === today.getTime()
			: false;

		// Sanitize user data for frontend with updated streak
		const user = {
			...sanitizeUserForFrontend(locals.user),
			devlogStreak: currentStreak,
			hasPostedToday
		};

		return json({
			success: true,
			user,
			coins,
			stellarships,
			paintchips,
			furniture,
			projects
		});
	} catch (err) {
		console.error('Error fetching user data:', err);
		const errorMessage = err instanceof Error ? err.message : 'Failed to get user data';

		return json(
			{
				success: false,
				error: { message: errorMessage }
			},
			{ status: 500 }
		);
	}
}
