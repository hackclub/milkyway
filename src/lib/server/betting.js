import { base } from './db.js';
import { escapeAirtableFormula } from './security.js';
import { getHackatimeUserId, fetchStatsByUserId } from './hackatime.js';
import { getUserProjectsByEmail } from './projects.js';

/**
 * Calculate total hours worked (Hackatime + Artlogs) for a date range
 * Only includes Hackatime projects that are linked to user's project eggs
 * Only includes approved & pending artlogs
 * @param {string} userEmail - User's email address
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<{codeHours: number, artHours: number, totalHours: number}>}
 */
export async function calculateHoursInRange(userEmail, startDate, endDate) {
	try {
		// Validate dates
		if (!(startDate instanceof Date) || !(endDate instanceof Date) || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
			throw new Error('Invalid date range provided');
		}
		if (startDate > endDate) {
			throw new Error('Start date must be before end date');
		}

		// Format dates for API queries
		const startDateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
		const endDateStr = endDate.toISOString().split('T')[0];

		// Get user's projects
		const userProjects = await getUserProjectsByEmail(userEmail);
		const projectIds = userProjects.map(p => p.id);

		// Collect all unique Hackatime project names from user's projects
		const hackatimeProjectNames = new Set();
		for (const project of userProjects) {
			const hackatimeProjects = typeof project.hackatimeProjects === 'string'
				? project.hackatimeProjects.split(', ').filter(n => n.trim())
				: Array.isArray(project.hackatimeProjects)
					? project.hackatimeProjects.filter(n => n && n.trim())
					: [];

			for (const name of hackatimeProjects) {
				hackatimeProjectNames.add(name);
			}
		}

		// Calculate Hackatime hours (code hours) - only for projects linked to user's project eggs
		let codeHours = 0;
		try {
			const hackatimeUserId = await getHackatimeUserId(userEmail);
			const hackatimeData = await fetchStatsByUserId(hackatimeUserId, startDateStr, endDateStr);
			
			if (hackatimeData && hackatimeData.data && hackatimeData.data.projects) {
				// Sum hours only for projects that match user's hackatime project names
				for (const htProject of hackatimeData.data.projects) {
					const isMatch = hackatimeProjectNames.has(htProject.name);
					if (isMatch) {
						codeHours += htProject.total_seconds / 3600;
					}
				}
			}
		} catch (hackatimeError) {
			console.error('Error fetching Hackatime data:', hackatimeError);
			// Continue with 0 code hours if Hackatime fails
		}

		// Calculate Artlog hours (art hours) - only approved & pending
		let artHours = 0;
		try {
			if (projectIds.length > 0) {
				const escapedProjectIds = projectIds.map(id => escapeAirtableFormula(String(id)));
				const projectFilters = escapedProjectIds.map(
					id => `FIND("|${id}|", "|" & ARRAYJOIN({Projects}, "|") & "|") > 0`
				);
				const projectFilterFormula = projectFilters.join(',');

				// Format dates for Airtable query (ISO format)
				const startISO = startDate.toISOString();
				const endISO = endDate.toISOString();

				const filterFormula = `AND(
					OR(${projectFilterFormula}),
					IS_AFTER({Created}, "${startISO}"),
					IS_BEFORE({Created}, "${endISO}")
				)`;

				const artlogRecords = await base('Artlog')
					.select({
						filterByFormula: filterFormula
					})
					.all();

				for (const record of artlogRecords) {
					const hours = typeof record.fields.hours === 'number' ? record.fields.hours : 0;
					const approvedHours = typeof record.fields.approvedHours === 'number' ? record.fields.approvedHours : null;
					
					// Only count approved or pending artlogs
					// approved: approvedHours === hours (or approvedHours > 0 for decreased but still approved)
					// pending: approvedHours is null/undefined
					// rejected: approvedHours === 0 (don't count)
					if (approvedHours === null || approvedHours > 0) {
						// For approved/decreased, use approvedHours; for pending, use hours
						const hoursToCount = approvedHours !== null ? approvedHours : hours;
						artHours += hoursToCount;
					}
				}
			}
		} catch (artlogError) {
			console.error('Error fetching Artlog data:', artlogError);
			// Continue with 0 art hours if Artlog fails
		}

		const totalHours = Math.round((codeHours + artHours) * 100) / 100;

		return {
			codeHours: Math.round(codeHours * 100) / 100,
			artHours: Math.round(artHours * 100) / 100,
			totalHours
		};
	} catch (error) {
		console.error('Error calculating hours in range:', error);
		throw error;
	}
}

/**
 * Calculate hours worked in past 7 days (rolling window)
 * Used to determine max bet amount
 * Includes today - end date is set to tomorrow to ensure today's data is included
 * @param {string} userEmail - User's email address
 * @param {Date} [referenceDate] - Reference date (defaults to now)
 * @returns {Promise<{codeHours: number, artHours: number, totalHours: number, maxBet: number}>}
 */
export async function calculatePast7DaysHours(userEmail, referenceDate = new Date()) {
	const endDate = new Date(referenceDate);
	endDate.setDate(endDate.getDate() + 1); // Set to tomorrow to include today
	const startDate = new Date(referenceDate);
	startDate.setDate(startDate.getDate() - 7);

	const hours = await calculateHoursInRange(userEmail, startDate, endDate);
	const maxBet = Math.floor(hours.totalHours * 5);

	return {
		...hours,
		maxBet
	};
}

/**
 * Calculate hours worked during a bet period
 * Includes the end date - adds 1 day to end date to ensure end date day is included
 * @param {string} userEmail - User's email address
 * @param {Date} startDate - Bet start date
 * @param {Date} endDate - Bet end date
 * @returns {Promise<{codeHours: number, artHours: number, totalHours: number}>}
 */
export async function calculateBetPeriodHours(userEmail, startDate, endDate) {
	// Add 1 day to end date to include the end date day itself (same as past 7 days calculation)
	const inclusiveEndDate = new Date(endDate);
	inclusiveEndDate.setDate(inclusiveEndDate.getDate() + 1);
	return await calculateHoursInRange(userEmail, startDate, inclusiveEndDate);
}

/**
 * Get user's active bet
 * @param {string} userEmail - User's email address (primary identifier)
 * @returns {Promise<Object|null>} Active bet record or null
 */
export async function getUserActiveBet(userEmail) {
	try {
		// Get user's record ID from email first
		const escapedEmail = escapeAirtableFormula(userEmail);
		const userRecords = await base('User')
			.select({
				filterByFormula: `{email} = "${escapedEmail}"`,
				maxRecords: 1
			})
			.firstPage();

		if (userRecords.length === 0) {
			return null;
		}

		// Query Bets table using FIND with ARRAYJOIN for linked record field
		// NOTE: Even though the user field is stored as an array of record IDs in Airtable,
		// when using ARRAYJOIN in a formula, Airtable resolves linked records to their
		// primary identifier (email) values, not record IDs. Therefore we must use
		// escapedEmail (the primary identifier) in the FIND, not the record ID.
		// Use pipe delimiters to prevent substring matches
		const filterFormula = `AND(
			FIND("|${escapedEmail}|", "|" & ARRAYJOIN({user}, "|") & "|") > 0,
			OR(
				{status} = "active",
				AND({status} = "won", IS_BEFORE(NOW(), {expiryDate}))
			)
		)`;
		
		const records = await base('Bets')
			.select({
				filterByFormula: filterFormula
			})
			.firstPage();

		if (records.length === 0) {
			return null;
		}

		return records[0];
	} catch (error) {
		console.error('Error getting user active bet:', error);
		throw error;
	}
}

/**
 * Determine bet status based on hours worked and dates
 * @param {Object} bet - Bet record
 * @param {number} hoursWorked - Hours worked during bet period
 * @param {Date} now - Current date/time
 * @returns {string} Updated status
 */
export function determineBetStatus(bet, hoursWorked, now = new Date()) {
	const endDate = new Date(bet.fields.endDate); // endDate also serves as claimableDate
	const expiryDate = new Date(bet.fields.expiryDate);
	const hoursGoal = bet.fields.hoursGoal;

	// If already claimed or lost, return current status
	if (['claimed', 'lost', 'expired'].includes(bet.fields.status)) {
		return bet.fields.status;
	}

	// If before end date (claimable date), still active
	if (now < endDate) {
		return 'active';
	}

	// Check expiry FIRST before determining if it's won
	// If past expiry date, mark as expired if goal was met, or lost if not
	if (now >= expiryDate) {
		if (bet.fields.status === 'won') {
			return 'expired';
		}
		// Check if goal was met - if so, expired (was won but not claimed in time)
		// If not, lost (never met goal)
		if (hoursWorked >= hoursGoal) {
			return 'expired'; // Was won but expired before claiming
		} else {
			return 'lost'; // Never met goal, so lost
		}
	}

	// After endDate but before expiryDate - check if hours goal met
	if (hoursWorked >= hoursGoal) {
		return 'won';
	} else {
		return 'lost';
	}
}

/**
 * Get user's bet history
 * @param {string} userEmail - User's email address (primary identifier)
 * @returns {Promise<Array<Object>>} Array of bet records
 */
export async function getUserBetHistory(userEmail) {
	try {
		const escapedEmail = escapeAirtableFormula(userEmail);
		
		// Query Bets table using FIND with ARRAYJOIN for linked record field
		// NOTE: Even though the user field is stored as an array of record IDs in Airtable,
		// when using ARRAYJOIN in a formula, Airtable resolves linked records to their
		// primary identifier (email) values, not record IDs. Therefore we must use
		// escapedEmail (the primary identifier) in the FIND, not the record ID.
		// Use pipe delimiters to prevent substring matches
		const records = await base('Bets')
			.select({
				filterByFormula: `FIND("|${escapedEmail}|", "|" & ARRAYJOIN({user}, "|") & "|") > 0`,
				sort: [{ field: 'startDate', direction: 'desc' }]
			})
			.all();

		return records;
	} catch (error) {
		console.error('Error getting user bet history:', error);
		throw error;
	}
}
