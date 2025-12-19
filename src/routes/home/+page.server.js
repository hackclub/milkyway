import { redirect } from '@sveltejs/kit';
import { getUserProjectsByEmail } from '$lib/server/projects.js';
import { getUserFurnitureByEmail } from '$lib/server/furniture.js';
import { getUserCoinsAndStellarships, sanitizeUserForFrontend } from '$lib/server/auth.js';
import { getUnclaimedBlackholeResults, getProjectsWithStellarShips } from '$lib/server/blackhole.js';
import { getUserActiveBet, calculateBetPeriodHours, determineBetStatus } from '$lib/server/betting.js';
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
	/** @type {any[]} */
	let unclaimedBlackholeResults = [];
	/** @type {string[]} */
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

	// Load current bet
	/** @type {any} */
	let currentBet = null;
	try {
		const activeBet = /** @type {any} */ (await getUserActiveBet(locals.user.email));
		if (activeBet) {
			const betFields = /** @type {any} */ (activeBet.fields);
			const startDate = new Date(betFields.startDate);
			const endDate = new Date(betFields.endDate);
			const now = new Date();

			// Calculate hours worked during bet period
			const hoursData = await calculateBetPeriodHours(locals.user.email, startDate, endDate);

			// Determine current status
			const currentStatus = determineBetStatus(activeBet, hoursData.totalHours, now);

			// Always update hoursWorked, and update status/coinsEarned if status changed
			const { base } = await import('$lib/server/db.js');
			/** @type {any} */
			const updateFields = {
				hoursWorked: hoursData.totalHours
			};
			
			if (currentStatus !== betFields.status) {
				updateFields.status = currentStatus;
				
				// Calculate and store coinsEarned if bet is won
				if (currentStatus === 'won') {
					updateFields.coinsEarned = Math.round(betFields.betAmount * betFields.multiplier);
				}
			}
			
			await base('Bets').update(activeBet.id, updateFields);

			currentBet = {
				id: activeBet.id,
				betAmount: Number(betFields.betAmount) || 0,
				hoursGoal: Number(betFields.hoursGoal) || 0,
				multiplier: Number(betFields.multiplier) || 1,
				startDate: betFields.startDate,
				endDate: betFields.endDate,
				expiryDate: betFields.expiryDate,
				status: currentStatus,
				hoursWorked: Number(hoursData.totalHours) || 0,
				hoursBreakdown: {
					codeHours: Number(hoursData.codeHours) || 0,
					artHours: Number(hoursData.artHours) || 0
				},
				coinsEarned: Number(betFields.coinsEarned) || (currentStatus === 'won' ? Math.round(Number(betFields.betAmount) * Number(betFields.multiplier)) : 0),
				attachedProject: betFields.attachedProject || null
			};
		}
	} catch (error) {
		console.error('[home/+page.server] Error loading current bet:', error);
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
		stellarShipProjectIds,
		currentBet
	};
}
