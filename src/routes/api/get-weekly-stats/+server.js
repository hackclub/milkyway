import { json } from '@sveltejs/kit';
import { getUserProjectsByEmail } from '$lib/server/projects.js';
import { getHackatimeUserId, fetchStatsByUserId } from '$lib/server/hackatime.js';
import { base } from '$lib/server/db.js';
import { sanitizeErrorMessage } from '$lib/server/security.js';

/**
 * Get weekly coding stats (code + art hours) for the past 7 days
 * Only includes Hackatime projects that are linked to user's project eggs
 */
export async function POST({ locals, request }) {
	try {
		if (!locals.user) {
			return json({ 
				success: false,
				error: 'Unauthorized',
				dailyStats: null 
			}, { status: 401 });
		}

		const email = locals.user.email;
		if (!email) {
			return json({ error: 'User email not found' }, { status: 400 });
		}

		// Get timezone from request body (defaults to UTC if not provided)
		const body = await request.json().catch(() => ({}));
		const timezone = body.timezone || 'UTC';

		// Get user's projects
		const userProjects = await getUserProjectsByEmail(email);
		
		// Collect all unique Hackatime project names from user's projects
		const hackatimeProjectNames = new Set();
		const userProjectIds = new Set(userProjects.map(p => p.id));

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

		// Get Hackatime user ID once (reuse for all queries)
		const hackatimeUserId = await getHackatimeUserId(email);

		// Helper function to get start/end of day in user's timezone, converted to UTC
		/**
		 * @param {Date} date
		 * @param {string} tz
		 */
		function getDayBoundariesInUTC(date, tz) {
			// Get the date string in user's timezone (YYYY-MM-DD)
			const formatter = new Intl.DateTimeFormat('en-CA', {
				timeZone: tz,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit'
			});
			const localDateStr = formatter.format(date);
			const [year, month, day] = localDateStr.split('-').map(Number);
			
			// Create a date string for midnight in the user's timezone
			// We'll use a trick: create a date that represents noon in UTC, format it in the TZ,
			// then work backwards to find midnight
			
			// Create UTC date for noon of this date (to avoid DST edge cases)
			const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
			
			// Format UTC noon in user's timezone to see what time it is there
			const tzNoonFormatter = new Intl.DateTimeFormat('en-US', {
				timeZone: tz,
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			});
			const tzNoonParts = tzNoonFormatter.formatToParts(utcNoon);
			const tzNoonHour = parseInt(tzNoonParts.find(p => p.type === 'hour')?.value || '12');
			const tzNoonMinute = parseInt(tzNoonParts.find(p => p.type === 'minute')?.value || '0');
			
			// Calculate offset: if UTC noon is 12:00 in TZ, offset is 0
			// If UTC noon is 13:00 in TZ, TZ is 1 hour ahead, so offset is -1 hour
			const offsetFromNoon = (tzNoonHour - 12) * 60 + tzNoonMinute; // minutes
			const offsetMs = offsetFromNoon * 60 * 1000;
			
			// Midnight in user's TZ = UTC noon - 12 hours - offset
			const startUTC = new Date(utcNoon.getTime() - (12 * 60 * 60 * 1000) - offsetMs);
			// End of day = start + 24 hours - 1ms
			const endUTC = new Date(startUTC.getTime() + (24 * 60 * 60 * 1000) - 1);
			
			return {
				startUTC: startUTC.toISOString(),
				endUTC: endUTC.toISOString(),
				dateStr: localDateStr
			};
		}

		// Generate dates for the last 7 days in user's timezone
		const now = new Date();
		const dates = [];
		for (let i = 6; i >= 0; i--) {
			const date = new Date(now);
			date.setDate(date.getDate() - i);
			const boundaries = getDayBoundariesInUTC(date, timezone);
			
			// Calculate next day's start for the end date (query from start of day to start of next day)
			const nextDay = new Date(date);
			nextDay.setDate(nextDay.getDate() + 1);
			const nextDayBoundaries = getDayBoundariesInUTC(nextDay, timezone);
			
			dates.push({
				dateStr: boundaries.dateStr, // YYYY-MM-DD in user's timezone
				startDate: boundaries.dateStr, // Start date for Hackatime query
				endDate: nextDayBoundaries.dateStr, // End date (next day) for Hackatime query
				startUTC: boundaries.startUTC,
				endUTC: boundaries.endUTC
			});
		}

		// OPTIMIZATION: Fetch all artlogs for the week in one query, then filter by day in memory
		const weekStartUTC = dates[0].startUTC;
		const weekEndUTC = dates[dates.length - 1].endUTC;
		
		let allArtlogs = [];
		try {
			const artlogRecords = await base('Artlog')
				.select({
					filterByFormula: `AND(
						IS_AFTER({Created}, "${weekStartUTC}"),
						IS_BEFORE({Created}, "${weekEndUTC}")
					)`
				})
				.all();
			
			// Process artlogs and group by day
			allArtlogs = artlogRecords.map(record => ({
				id: record.id,
				created: new Date(record.fields.Created),
				hours: typeof record.fields.hours === 'number' ? record.fields.hours : 0,
				projectIds: record.fields.Projects || []
			}));
		} catch (artlogError) {
			console.error('[get-weekly-stats] Failed to fetch artlogs:', artlogError);
		}

		// Create a map from project ID to project name for art hours
		const projectIdToName = new Map();
		for (const project of userProjects) {
			projectIdToName.set(project.id, project.name);
		}

		// Fetch Hackatime data for each day
		const dailyStats = await Promise.all(
			dates.map(async (dayInfo) => {
				let codeHours = 0;
				let artHours = 0;
				const codeProjectBreakdown = new Map(); // project name -> hours
				const artProjectBreakdown = new Map(); // project name -> hours

				// Fetch Hackatime data for this day (query from start of day to start of next day)
				try {
					const hackatimeData = await fetchStatsByUserId(hackatimeUserId, dayInfo.startDate, dayInfo.endDate);
					
					if (hackatimeData && hackatimeData.data && hackatimeData.data.projects) {
						// Sum hours only for projects that match user's hackatime project names
						for (const htProject of hackatimeData.data.projects) {
							const isMatch = hackatimeProjectNames.has(htProject.name);
							const hours = htProject.total_seconds / 3600;
							
							if (isMatch) {
								codeHours += hours;
								// Track project breakdown
								const currentHours = codeProjectBreakdown.get(htProject.name) || 0;
								codeProjectBreakdown.set(htProject.name, currentHours + hours);
							}
						}
					}
				} catch (hackatimeError) {
					// If Hackatime fails for this day, just continue with 0 code hours
					console.error(`[get-weekly-stats] Failed to fetch Hackatime data for ${dayInfo.dateStr}:`, hackatimeError);
				}

				// Filter artlogs for this day from the pre-fetched list (optimization: no extra queries)
				const dayStartUTC = new Date(dayInfo.startUTC);
				const dayEndUTC = new Date(dayInfo.endUTC);
				
				for (const artlog of allArtlogs) {
					if (artlog.created >= dayStartUTC && artlog.created < dayEndUTC) {
						// Check if this artlog is linked to any of the user's projects
						for (const projectId of artlog.projectIds) {
							if (userProjectIds.has(projectId)) {
								artHours += artlog.hours;
								// Track project breakdown
								const projectName = projectIdToName.get(projectId) || 'Unknown Project';
								const currentHours = artProjectBreakdown.get(projectName) || 0;
								artProjectBreakdown.set(projectName, currentHours + artlog.hours);
								break; // Only count once per artlog
							}
						}
					}
				}

				// Convert maps to arrays for JSON serialization
				const codeBreakdown = Array.from(codeProjectBreakdown.entries()).map(([name, hours]) => ({
					name,
					hours: Math.round(hours * 100) / 100
				}));
				const artBreakdown = Array.from(artProjectBreakdown.entries()).map(([name, hours]) => ({
					name,
					hours: Math.round(hours * 100) / 100
				}));

				return {
					date: dayInfo.dateStr, // Return date in user's timezone format
					codeHours: Math.round(codeHours * 100) / 100,
					artHours: Math.round(artHours * 100) / 100,
					totalHours: Math.round((codeHours + artHours) * 100) / 100,
					codeProjectBreakdown: codeBreakdown,
					artProjectBreakdown: artBreakdown
				};
			})
		);

		return json({
			success: true,
			dailyStats
		});
	} catch (error) {
		console.error('Error in get-weekly-stats API:', error);
		return json({
			error: 'Failed to fetch weekly stats',
			details: sanitizeErrorMessage(error, 'Unknown error')
		}, { status: 500 });
	}
}
