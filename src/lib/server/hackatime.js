/**
 * Fetches projects from HackaTime API for a given user email and date
 * @param {string} email - User's email address
 * @param {string|null} date - Date in YYYY-MM-DD format
 * @param {string|null} startDate - Start date in YYYY-MM-DD format (optional)
 * @param {string|null} endDate - End date in YYYY-MM-DD format (optional)
 * @returns {Promise<Object>} - API response data
 */

import dotenv from 'dotenv';
dotenv.config();

/**
 * @param {string} email
 * @param {string|null} date
 * @param {string|null} [startDate]
 * @param {string|null} [endDate]
 */
export async function fetchProjects(email, date, startDate = null, endDate = null) {
	try {
		const headers = {
			'Rack-Attack-Bypass': process.env.HACKATIME_RATE_LIMIT_BYPASS || '',
			Authorization: 'Bearer ' + (process.env.STATS_API_KEY || '')
		};

		const response = await fetch(
			`https://hackatime.hackclub.com/api/v1/users/lookup_email/${encodeURIComponent(email)}`,
			{
				method: 'GET',
				headers
			}
		);

		if (!response.ok) {
			// Try to get error details from the response
			let errorDetails = '';
			try {
				const errorBody = await response.text();
				errorDetails = errorBody;
			} catch (e) {
				errorDetails = 'Could not read error response';
			}

			console.error('[hackatime] Lookup API error:', {
				status: response.status,
				statusText: response.statusText,
				errorDetails
			});

			throw new Error(`HTTP error! status: ${response.status} - ${errorDetails}`);
		}
		const data = await response.json();
		const hackatimeId = data.user_id;

		try {
			const headers2 = {
				'Rack-Attack-Bypass': process.env.HACKATIME_RATE_LIMIT_BYPASS || ''
			};

			let apiUrl = `https://hackatime.hackclub.com/api/v1/users/${hackatimeId}/stats?features=projects`;
			if (startDate) {
				apiUrl += `&start_date=${startDate}`;
			}
			if (endDate) {
				apiUrl += `&end_date=${endDate}`;
			}

			const projectData = await fetch(apiUrl, {
				method: 'GET',
				headers
			});
			
			if (!projectData.ok) {
				const errorText = await projectData.text();
				console.error('[hackatime] Stats API error:', {
					status: projectData.status,
					statusText: projectData.statusText,
					errorBody: errorText
				});
				throw new Error(`Stats API error! status: ${projectData.status} - ${errorText}`);
			}

			const projdata = await projectData.json();
			return projdata;
		} catch (error) {
			console.error('Error fetching projects from HackaTime:', error);
			throw error;
		}
	} catch (error) {
		console.error('Error fetching projects from HackaTime:', error);
		throw error;
	}
}

/**
 * Get Hackatime user ID from email (cached lookup)
 * @param {string} email - User's email address
 * @returns {Promise<string>} - Hackatime user ID
 */
export async function getHackatimeUserId(email) {
	const headers = {
		'Rack-Attack-Bypass': process.env.HACKATIME_RATE_LIMIT_BYPASS || '',
		Authorization: 'Bearer ' + (process.env.STATS_API_KEY || '')
	};

	const response = await fetch(
		`https://hackatime.hackclub.com/api/v1/users/lookup_email/${encodeURIComponent(email)}`,
		{
			method: 'GET',
			headers
		}
	);

	if (!response.ok) {
		let errorDetails = '';
		try {
			const errorBody = await response.text();
			errorDetails = errorBody;
		} catch (e) {
			errorDetails = 'Could not read error response';
		}

		console.error('[hackatime] Lookup API error:', {
			status: response.status,
			statusText: response.statusText,
			errorDetails
		});

		throw new Error(`HTTP error! status: ${response.status} - ${errorDetails}`);
	}
	
	const data = await response.json();
	return data.user_id;
}

/**
 * Fetch stats for a specific Hackatime user ID with date range
 * @param {string} hackatimeId - Hackatime user ID
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Object>} - API response data
 */
export async function fetchStatsByUserId(hackatimeId, startDate, endDate) {
	const headers = {
		'Rack-Attack-Bypass': process.env.HACKATIME_RATE_LIMIT_BYPASS || ''
	};

	let apiUrl = `https://hackatime.hackclub.com/api/v1/users/${hackatimeId}/stats?features=projects`;
	if (startDate) {
		apiUrl += `&start_date=${startDate}`;
	}
	if (endDate) {
		apiUrl += `&end_date=${endDate}`;
	}

	const projectData = await fetch(apiUrl, {
		method: 'GET',
		headers
	});
	
	if (!projectData.ok) {
		const errorText = await projectData.text();
		console.error('[hackatime] Stats API error:', {
			status: projectData.status,
			statusText: projectData.statusText,
			errorBody: errorText
		});
		throw new Error(`Stats API error! status: ${projectData.status} - ${errorText}`);
	}

	return await projectData.json();
}

/**
 * Fetches ONLY today's Hackatime hours for projects
 * @param {string} email - User's email address
 * @returns {Promise<Object>} - API response data with only today's hours
 */
export async function fetchTodayProjects(email) {
	const today = new Date();
	const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

	const result = await fetchProjects(email, null, todayStr, null);

	return result;
}
