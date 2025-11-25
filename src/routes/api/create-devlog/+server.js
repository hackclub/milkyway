import { json } from '@sveltejs/kit';
import { sanitizeErrorMessage, checkRateLimit, getClientIdentifier } from '$lib/server/security.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { createDevlog, getTodayDevlogs } from '$lib/server/devlogs.js';
import { getUserProjectsByEmail } from '$lib/server/projects.js';
import { fetchTodayProjects } from '$lib/server/hackatime.js';
import { base } from '$lib/server/db.js';
import { 
	validateTitle, 
	validateDescription, 
	validateFileDeep,
	MAX_ATTACHMENTS
} from '$lib/server/validation.js';
import { sanitizeFilename } from '$lib/utils/sanitize.js';

// POST - Create user devlog
export async function POST({ locals, cookies, request }) {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Rate limiting: 10 devlogs per hour per user
		const clientId = getClientIdentifier(request, cookies);
		if (!checkRateLimit(`create-devlog:${clientId}`, 10, 3600000)) {
			return json(
				{
					success: false,
					error: 'Too many devlogs created. Please try again later.'
				},
				{ status: 429 }
			);
		}

		const userInfo = await getUserInfoBySessionId(cookies.get('sessionid'));

		// Get form data from request
		const formData = await request.formData();
		const title = formData.get('title');
		const description = formData.get('description');
		const selectedProjects = formData.get('selectedProjects');

		// Validate title
		const titleValidation = validateTitle(title);
		if (!titleValidation.valid) {
			return json({ error: titleValidation.error }, { status: 400 });
		}

		// Validate description
		const descriptionValidation = validateDescription(description);
		if (!descriptionValidation.valid) {
			return json({ error: descriptionValidation.error }, { status: 400 });
		}

		// Validate projects
		if (!selectedProjects || typeof selectedProjects !== 'string' || !selectedProjects.trim()) {
			return json({ error: 'please select at least one project!' }, { status: 400 });
		}

		// calculate hours from projects with hours logged TODAY
		// make sure to subtract any hours already claimed in existing devlogs today
		let calculatedHours = 0;
		let codeHours = 0;
		let artHours = 0;
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
						codeHours += todayCodeHours;
						artHours += todayArtHours;
					}
				}

				calculatedHours = Math.round(calculatedHours * 100) / 100; // 2 decimal places
				codeHours = Math.round(codeHours * 100) / 100;
				artHours = Math.round(artHours * 100) / 100;
			} catch (projectError) {
				console.error('Failed to fetch projects for devlog hours calculation:', projectError);
				// Don't fail the devlog creation, just set hours to 0
				calculatedHours = 0;
				codeHours = 0;
				artHours = 0;
			}
		}

		// photos or videos - with enhanced validation
		const photos = [];
		let photoIndex = 0;

		while (formData.has(`photo${photoIndex}`) && photoIndex < MAX_ATTACHMENTS) {
			const photoFile = formData.get(`photo${photoIndex}`);

			if (photoFile && photoFile instanceof File) {
				// Validate file deeply (type, size, and signature)
				const fileValidation = await validateFileDeep(photoFile, photoIndex);
				if (!fileValidation.valid) {
					return json({ error: fileValidation.error }, { status: 400 });
				}

				const arrayBuffer = await photoFile.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);
				const base64 = buffer.toString('base64');
				const dataUrl = `data:${photoFile.type};base64,${base64}`;

				// Sanitize filename
				const safeFilename = sanitizeFilename(photoFile.name);

				photos.push({
					data: dataUrl,
					filename: safeFilename,
					contentType: photoFile.type
				});
			}

			photoIndex++;
		}

		// Validate that at least one attachment is provided
		if (photos.length === 0) {
			return json({ error: 'per favore aggiungi almeno una foto o un video!' }, { status: 400 });
		}

		// Warn if too many attachments (silently ignore extras)
		if (formData.has(`photo${MAX_ATTACHMENTS}`)) {
			console.warn(`User tried to upload more than ${MAX_ATTACHMENTS} files`);
		}

		try {
			const devlogData = {
				title: title.trim(),
				content: description.trim(),
				hours: calculatedHours, // server-calculated total hours
				codeHours: codeHours, // code hours from Hackatime
				artHours: artHours, // art hours from Artlogs
				projects: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
				photos: photos.length > 0 ? photos : undefined
			};

			console.log('Creating devlog with data:', {
				title: devlogData.title,
				hours: devlogData.hours,
				codeHours: devlogData.codeHours,
				artHours: devlogData.artHours,
				projects: devlogData.projects,
				projectCount: selectedProjectIds.length
			});

			const devlog = await createDevlog(userInfo.recId, devlogData);

			console.log('Devlog created, saved fields:', {
				id: devlog.devlog.id,
				hours: devlog.devlog.fields.hours,
				codeHours: devlog.devlog.fields.codeHours,
				artHours: devlog.devlog.fields.artHours,
				projectIds: devlog.devlog.fields.projectIds,
				title: devlog.devlog.fields.title,
				streak: devlog.streak
			});

			return json({
				success: true,
				devlog: devlog.devlog.fields,
				calculatedHours,
				codeHours,
				artHours,
				savedProjects: selectedProjectIds,
				streak: devlog.streak
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
