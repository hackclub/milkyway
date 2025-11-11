import { redirect } from '@sveltejs/kit';
import { getUserProjectsByEmail } from '$lib/server/projects.js';
import { getUserFurnitureByEmail } from '$lib/server/furniture.js';
import { getUserCoinsAndStellarships, sanitizeUserForFrontend } from '$lib/server/auth.js';
import { getUserTamagotchi } from '$lib/server/tamagotchi.js';

export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	// Load user's projects from Airtable
	const projects = await getUserProjectsByEmail(locals.user.email);

	// Load user's furniture from Airtable
	const furniture = await getUserFurnitureByEmail(locals.user.email);

	// Load user's coins and stellarships from Airtable
	const { coins, stellarships, paintchips } = await getUserCoinsAndStellarships(locals.user.recId);

	// Load user's tamagotchi from Airtable
	let tamagotchi = await getUserTamagotchi(locals.user.recId);

	// Serialize tamagotchi data for frontend
	tamagotchi = tamagotchi ? tamagotchi.fields : null;

	// Check if user has completed onboarding
	const hasOnboarded = locals.user.hasOnboarded || false;

	return {
		user: sanitizeUserForFrontend(locals.user), // Sanitize user data before sending to frontend
		projects,
		furniture,
		coins,
		stellarships,
		paintchips,
		hasOnboarded,
		tamagotchi
	};
}
