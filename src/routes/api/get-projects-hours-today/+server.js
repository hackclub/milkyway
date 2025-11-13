import { json } from '@sveltejs/kit';
import { getUserProjectsByEmail } from '$lib/server/projects.js';
import { fetchTodayProjects } from '$lib/server/hackatime.js';
import { sanitizeErrorMessage } from '$lib/server/security.js';
import { base } from '$lib/server/db.js';
import { getTodayDevlogs } from '$lib/server/devlogs.js';

export async function POST({ locals, cookies }) {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const email = locals.user.email;

		if (!email) {
			return json({ error: 'User email not found' }, { status: 400 });
		}

		const allProjects = await getUserProjectsByEmail(email);

		// get the user's record id
		const { getUserInfoBySessionId } = await import('$lib/server/auth.js');
		const sessionId = cookies.get('sessionid');
		const userInfo = sessionId ? await getUserInfoBySessionId(sessionId) : null;
		const userId = userInfo?.recId;

		let alreadyClaimedHours = new Map(); // projectId -> hours already claimed today

		if (userId) {
			try {
				const todayDevlogs = await getTodayDevlogs(userId);
				console.log(`Found ${todayDevlogs.length} devlogs created today`);

				for (const devlog of todayDevlogs) {
					const devlogProjects = devlog.projects || [];
					// distribute hours equally across projects in this devlog
					const hoursPerProject =
						devlogProjects.length > 0 ? devlog.hours / devlogProjects.length : 0;

					for (const projectId of devlogProjects) {
						const currentClaimed = alreadyClaimedHours.get(projectId) || 0;
						alreadyClaimedHours.set(projectId, currentClaimed + hoursPerProject);
					}
				}
			} catch (devlogError) {
				console.error('Failed to fetch today devlogs:', devlogError);
				// continue without already claimed hours
			}
		}

		let todayHackatimeData = null;
		let hackatimeUserNotFound = false;

		try {
			todayHackatimeData = await fetchTodayProjects(email);
		} catch (hackatimeError) {
			if (
				hackatimeError instanceof Error &&
				hackatimeError.message &&
				hackatimeError.message.includes('HTTP error! status: 404')
			) {
				hackatimeUserNotFound = true;
			}
		}

		// fetch TODAY's artlog hours
		// fetch recent artlogs and filter in memory instead
		const now = new Date();
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayISO = yesterday.toISOString();

		const artlogHoursByProject = new Map();

		if (allProjects.length > 0) {
			try {
				console.log('Fetching artlogs created after:', yesterdayISO);

				// simple date filter
				const artlogRecords = await base('Artlog')
					.select({
						filterByFormula: `IS_AFTER({Created}, "${yesterdayISO}")`
					})
					.all();

				console.log(`Found ${artlogRecords.length} artlogs in last ~24-48 hours`);

				// filter to last 24 hours AND user's projects in memory
				const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
				const userProjectIds = new Set(allProjects.map((p) => p.id));

				for (const artlog of artlogRecords) {
					const linkedProjectIds = artlog.fields.Projects || [];
					const hours = typeof artlog.fields.hours === 'number' ? artlog.fields.hours : 0;
					const createdAt = artlog.fields.Created ? new Date(artlog.fields.Created) : null;

					// skip if too old
					if (createdAt && createdAt < twentyFourHoursAgo) {
						continue;
					}

					// match with the user's projects
					for (const projectRecordId of linkedProjectIds) {
						if (userProjectIds.has(projectRecordId)) {
							const currentHours = artlogHoursByProject.get(projectRecordId) || 0;
							artlogHoursByProject.set(projectRecordId, currentHours + hours);
							console.log(
								`Added ${hours}h to project ${projectRecordId} (total now: ${currentHours + hours}h)`
							);
						}
					}
				}
			} catch (artlogError) {
				console.error('Failed to fetch artlog data:', artlogError);
			}
		}

		// build a map of project name -> today's hours from Hackatime
		const projectHoursToday = new Map();

		if (todayHackatimeData && todayHackatimeData.data && todayHackatimeData.data.projects) {
			for (const htProject of todayHackatimeData.data.projects) {
				const hoursToday = Math.round((htProject.total_seconds / 3600) * 100) / 100;
				projectHoursToday.set(htProject.name, hoursToday);
			}
		} else {
			console.log('No Hackatime projects data available');
		}

		// now match user projects with today's hours
		const projectsWithTodayHours = [];

		for (const project of allProjects) {
			// get the hackatime project names associated with this project
			const hackatimeProjectNames =
				typeof project.hackatimeProjects === 'string'
					? project.hackatimeProjects.split(', ').filter((n) => n.trim())
					: Array.isArray(project.hackatimeProjects)
						? project.hackatimeProjects.filter((n) => n && n.trim())
						: [];

			// calculate today's code hours for this project
			let todayCodeHours = 0;
			for (const htProjectName of hackatimeProjectNames) {
				const hours = projectHoursToday.get(htProjectName) || 0;
				todayCodeHours += hours;
				if (hours > 0) {
					console.log(`  Matched Hackatime project "${htProjectName}": ${hours}h`);
				}
			}

			const todayArtHours = artlogHoursByProject.get(project.id) || 0;

			const todayTotalHours = todayCodeHours + todayArtHours;

			// subtract already claimed hours
			const claimedHours = alreadyClaimedHours.get(project.id) || 0;
			const availableHours = Math.max(0, todayTotalHours - claimedHours);

			console.log(`  Already claimed: ${claimedHours}h, Available now: ${availableHours}h`);

			// only include projects with available hours
			if (availableHours > 0) {
				projectsWithTodayHours.push({
					id: project.id,
					name: project.name || 'Untitled Project',
					totalHours: Math.round(availableHours * 100) / 100,
					hackatimeHours: Math.round(todayCodeHours * 100) / 100,
					artHours: Math.round(todayArtHours * 100) / 100,
					claimedHours: Math.round(claimedHours * 100) / 100,
					created: project.created
				});
			}
		}

		return json({
			success: true,
			projects: projectsWithTodayHours,
			count: projectsWithTodayHours.length,
			hackatimeUserNotFound
		});
	} catch (error) {
		console.error('Error in get-projects-hours-today API:', error);
		return json(
			{
				error: 'Failed to fetch projects',
				details: sanitizeErrorMessage(error, 'Unknown error')
			},
			{ status: 500 }
		);
	}
}
