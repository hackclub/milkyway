import { json } from '@sveltejs/kit';
import { sanitizeErrorMessage } from '$lib/server/security.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { createDevlog, getTodayDevlogs } from '$lib/server/devlogs.js';
import { getUserProjectsByEmail } from '$lib/server/projects.js';
import { fetchTodayProjects } from '$lib/server/hackatime.js';
import { base } from '$lib/server/db.js';

const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB

// POST - Create user devlog
export async function POST({ locals, cookies, request }) {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userInfo = await getUserInfoBySessionId(cookies.get('sessionid'));

		// Get form data from request
		const formData = await request.formData();
		const title = formData.get('title');
		const description = formData.get('description');
		const selectedProjects = formData.get('selectedProjects');

		if (!title || typeof title !== 'string' || !title.trim()) {
			return json({ error: 'please write a title!' }, { status: 400 });
		}

		if (!description || typeof description !== 'string' || !description.trim()) {
			return json({ error: 'you also need a description!' }, { status: 400 });
		}

		if (!selectedProjects || typeof selectedProjects !== 'string' || !selectedProjects.trim()) {
			return json({ error: 'please select at least one project!' }, { status: 400 });
		}

		// calculate hours from projects with hours logged TODAY
		// make sure to subtract any hours already claimed in existing devlogs today
		let calculatedHours = 0;
		let selectedProjectIds = [];

		if (selectedProjects && selectedProjects.trim()) {
			try {
				selectedProjectIds = selectedProjects
					.split(',')
					.map((id) => id.trim())
					.filter((id) => id);

				const allProjects = await getUserProjectsByEmail(locals.user.email);

				let alreadyClaimedHours = new Map();

				try {
					const todayDevlogs = await getTodayDevlogs(userInfo.recId);
					console.log(`User has ${todayDevlogs.length} devlogs created today`);

					for (const devlog of todayDevlogs) {
						const devlogProjects = devlog.projects || [];
						const hoursPerProject =
							devlogProjects.length > 0 ? devlog.hours / devlogProjects.length : 0;

						for (const projectId of devlogProjects) {
							const currentClaimed = alreadyClaimedHours.get(projectId) || 0;
							alreadyClaimedHours.set(projectId, currentClaimed + hoursPerProject);
						}
					}
				} catch (devlogError) {
					console.error('Failed to fetch today devlogs:', devlogError);
				}

				let todayHackatimeData = null;
				try {
					todayHackatimeData = await fetchTodayProjects(locals.user.email);
				} catch (hackatimeError) {
					console.error('Failed to fetch today Hackatime data for devlog:', hackatimeError);
					// continue without hackatime hours
				}

				const projectHoursToday = new Map();
				if (todayHackatimeData && todayHackatimeData.data && todayHackatimeData.data.projects) {
					for (const htProject of todayHackatimeData.data.projects) {
						const hoursToday = Math.round((htProject.total_seconds / 3600) * 100) / 100;
						projectHoursToday.set(htProject.name, hoursToday);
					}
				}

				// fetch today's artlog hours
				const now = new Date();
				const yesterday = new Date(now);
				yesterday.setDate(yesterday.getDate() - 1);
				const yesterdayISO = yesterday.toISOString();

				const artlogHoursByProject = new Map();

				if (allProjects.length > 0) {
					try {
						const artlogRecords = await base('Artlog')
							.select({
								filterByFormula: `IS_AFTER({Created}, "${yesterdayISO}")`
							})
							.all();

						const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
						const userProjectIds = new Set(allProjects.map((p) => p.id));

						for (const artlog of artlogRecords) {
							const linkedProjectIds = artlog.fields.Projects || [];
							const hours = typeof artlog.fields.hours === 'number' ? artlog.fields.hours : 0;
							const createdAt = artlog.fields.Created ? new Date(artlog.fields.Created) : null;

							// Skip if too old
							if (createdAt && createdAt < twentyFourHoursAgo) {
								continue;
							}

							// Match with user's projects
							for (const projectRecordId of linkedProjectIds) {
								if (userProjectIds.has(projectRecordId)) {
									const currentHours = artlogHoursByProject.get(projectRecordId) || 0;
									artlogHoursByProject.set(projectRecordId, currentHours + hours);
								}
							}
						}
					} catch (artlogError) {
						console.error('Failed to fetch today artlog data for devlog:', artlogError);
					}
				}

				for (const project of allProjects) {
					if (selectedProjectIds.includes(project.id)) {
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
							todayCodeHours += projectHoursToday.get(htProjectName) || 0;
						}

						// get today's art hours from artlogs
						const todayArtHours = artlogHoursByProject.get(project.id) || 0;

						const totalHoursToday = todayCodeHours + todayArtHours;

						// subtract already claimed hours to get only the diff
						const claimedHours = alreadyClaimedHours.get(project.id) || 0;
						const availableHours = Math.max(0, totalHoursToday - claimedHours);

						console.log(`Project ${project.name}:`, {
							totalToday: totalHoursToday,
							claimed: claimedHours,
							available: availableHours
						});

						calculatedHours += availableHours;
					}
				}

				calculatedHours = Math.round(calculatedHours * 100) / 100; // 2 decimal places

				console.log('Calculated hours for devlog from TODAY ONLY (code + art, minus claimed):', {
					selectedProjectIds,
					totalProjectsChecked: allProjects.length,
					calculatedHours,
					note: 'Only unclaimed hours from today - prevents double claiming'
				});
			} catch (projectError) {
				console.error('Failed to fetch projects for devlog hours calculation:', projectError);
				// Don't fail the devlog creation, just set hours to 0
				calculatedHours = 0;
			}
		}

		// photos or videos
		const photos = [];
		let photoIndex = 0;

		while (formData.has(`photo${photoIndex}`)) {
			const photoFile = formData.get(`photo${photoIndex}`);

			if (photoFile && photoFile instanceof File) {
				// Limite dimensione solo per video
				if (photoFile.type.startsWith('video/') && photoFile.size > MAX_VIDEO_SIZE) {
					return json(
						{ error: `Il video "${photoFile.name}" è troppo grande (max 10MB)` },
						{ status: 400 }
					);
				}

				const arrayBuffer = await photoFile.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);
				const base64 = buffer.toString('base64');
				const dataUrl = `data:${photoFile.type};base64,${base64}`;

				photos.push({
					data: dataUrl,
					filename: photoFile.name,
					contentType: photoFile.type
				});
			}

			photoIndex++;
		}

		// Validate that at least one attachment is provided
		if (photos.length === 0) {
			return json({ error: 'per favore aggiungi almeno una foto o un video!' }, { status: 400 });
		}

		try {
			const devlogData = {
				title: title.trim(),
				content: description.trim(),
				hours: calculatedHours, // server-calculated hours
				projects: selectedProjectIds.length > 0 ? selectedProjectIds : undefined, //
				photos: photos.length > 0 ? photos : undefined
			};

			console.log('Creating devlog with data:', {
				title: devlogData.title,
				hours: devlogData.hours,
				projects: devlogData.projects,
				projectCount: selectedProjectIds.length
			});

			const devlog = await createDevlog(userInfo.recId, devlogData);

			console.log('Devlog created, saved fields:', {
				id: devlog.id,
				hours: devlog.fields.hours,
				projectIds: devlog.fields.projectIds,
				title: devlog.fields.title
			});

			return json({
				success: true,
				devlog: devlog.fields,
				calculatedHours, // Return calculated hours for debugging
				savedProjects: selectedProjectIds // Show what projects were saved
			});
		} catch (clearError) {
			console.error('Failed to create devlog', clearError);
			return json({ error: 'Failed to create devlog' }, { status: 500 });
		}
	} catch (error) {
		console.error('Error creating devlog:', error);
		return json(
			{
				error: sanitizeErrorMessage(/** @type {Error} */ (error), 'Failed to create devlog')
			},
			{ status: 500 }
		);
	}
}
