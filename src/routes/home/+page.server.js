import { redirect } from '@sveltejs/kit';
import { getUserProjectsByEmail } from '$lib/server/projects.js';
import { getUserFurnitureByEmail } from '$lib/server/furniture.js';
import { getUserCoinsAndStellarships, sanitizeUserForFrontend } from '$lib/server/auth.js';
import { getUnclaimedBlackholeResults, getProjectsWithStellarShips } from '$lib/server/blackhole.js';
import { env as PUBLIC_ENV } from '$env/dynamic/public';

export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	const showBlackhole = PUBLIC_ENV.PUBLIC_SHOW_BLACKHOLE === 'true';

	// Load user's projects from Airtable
	const projects = await getUserProjectsByEmail(locals.user.email);

	// Load user's furniture from Airtable
	const furniture = await getUserFurnitureByEmail(locals.user.email);

	// Load user's coins and stellarships from Airtable
	const { coins, stellarships, paintchips } = await getUserCoinsAndStellarships(locals.user.recId);

	// Check if user has completed onboarding
	const hasOnboarded = locals.user.hasOnboarded || false;

	// Load unclaimed blackhole results (approved/rejected that user hasn't claimed/dismissed)
	let unclaimedBlackholeResults = [];
	let stellarShipProjectIds = [];
	
	if (showBlackhole && locals.user.username) {
		try {
			unclaimedBlackholeResults = await getUnclaimedBlackholeResults(locals.user.username);
			
			// Get which projects have stellar ships (approved in blackhole)
			const projectIds = projects.map((/** @type {any} */ p) => p.id);
			const stellarShipSet = await getProjectsWithStellarShips(projectIds);
			stellarShipProjectIds = Array.from(stellarShipSet);
		} catch (e) {
			console.error('Error fetching blackhole results:', e);
		}
	}

	return {
		user: sanitizeUserForFrontend(locals.user), // Sanitize user data before sending to frontend
		projects,
		furniture,
		coins,
		stellarships,
		paintchips,
		hasOnboarded,
		showBlackhole,
		unclaimedBlackholeResults,
		stellarShipProjectIds
	};
}
