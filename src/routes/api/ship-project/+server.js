import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { escapeAirtableFormula } from '$lib/server/security.js';
import { getCreatureImageFromEgg } from '$lib/data/prompt-data.js';

export async function POST({ request, cookies }) {
	try {
		// Get user info from session
		const sessionId = cookies.get('sessionid');
		const userInfo = await getUserInfoBySessionId(sessionId || '');

		if (!userInfo) {
			return json(
				{
					success: false,
					error: { message: 'Authentication required' }
				},
				{ status: 401 }
			);
		}

		const {
			projectId,
			notMadeBy,
			howToPlay,
			addnComments,
			saveFormOnly,
			shipProject,
			hatchEgg,
			reShip,
			yswsSubmissionId
		} = await request.json();

		if (!projectId) {
			return json(
				{
					success: false,
					error: { message: 'Project ID required' }
				},
				{ status: 400 }
			);
		}

		// If saving form data only, validate form fields
		if (saveFormOnly) {
			if (!notMadeBy || !howToPlay || !addnComments) {
				return json(
					{
						success: false,
						error: { message: 'All form fields are required' }
					},
					{ status: 400 }
				);
			}
		}

		// Get the project from Airtable using the record ID directly
		const projectsTable = base('Projects');
		const projectRecord = await projectsTable.find(projectId);
		const projectData = projectRecord.fields;

		// Validate that the project belongs to the current user
		// The user field is a linked field, so we need to check if the current user's record ID is in the array
		const projectUserField = projectData.user;
		const projectUserIds = Array.isArray(projectUserField)
			? projectUserField
			: projectUserField
				? [String(projectUserField)]
				: [];

		if (!projectUserIds.includes(userInfo.recId)) {
			return json(
				{
					success: false,
					error: { message: 'Unauthorized access to project' }
				},
				{ status: 403 }
			);
		}

		// Validate ship requirements
		const validationErrors = [];

		if (
			!projectData.projectname ||
			projectData.projectname === 'untitled game!' ||
			(typeof projectData.projectname === 'string' && projectData.projectname.trim() === '')
		) {
			validationErrors.push('Project name is required');
		}

		if (
			!projectData.description ||
			(typeof projectData.description === 'string' && projectData.description.trim() === '')
		) {
			validationErrors.push('Game description is required');
		}

		if (
			!projectData.shipURL ||
			(typeof projectData.shipURL === 'string' && projectData.shipURL.trim() === '')
		) {
			validationErrors.push('Ship URL is required');
		}

		if (
			!projectData.githubURL ||
			(typeof projectData.githubURL === 'string' && projectData.githubURL.trim() === '')
		) {
			validationErrors.push('GitHub URL is required');
		}

		// Hours validation will be moved to shipProject block

		if (!projectData.projectImage && !projectData.image) {
			validationErrors.push('Custom project image is required');
		}

		// Check if this is a roulette project that needs wheel spinning
		if (projectData.promptinfo === 'roulette') {
			try {
				const addnData = projectData.addn ? JSON.parse(String(projectData.addn)) : {};
				const rouletteStatus = addnData.rouletteStatus;

				if (rouletteStatus !== 'complete') {
					validationErrors.push('All roulette wheels must be spun before shipping');
				}
			} catch (error) {
				// If addn data is invalid, treat as incomplete roulette
				validationErrors.push('All roulette wheels must be spun before shipping');
			}
		}

		if (validationErrors.length > 0) {
			return json(
				{
					success: false,
					error: { message: `Validation failed: ${validationErrors.join(', ')}` }
				},
				{ status: 400 }
			);
		}

		// Handle different operations based on flags
		if (saveFormOnly) {
			// Just save the form data without shipping
			await projectsTable.update(projectRecord.id, {
				notMadeBy: notMadeBy,
				howToPlay: howToPlay,
				addnComments: addnComments
			});

			return json({
				success: true,
				message: 'Form data saved successfully'
			});
		}

		if (hatchEgg) {
			// Hatch the egg - change image to corresponding creature and status
			const currentEggImage = String(projectData.egg || 'projects/new_egg1.png');
			const creatureImage = getCreatureImageFromEgg(currentEggImage);

			/** @type {any} */
			const updateData = {
				egg: creatureImage,
				status: 'submitted'
			};

			// Add YSWS submission link if provided
			if (yswsSubmissionId) {
				updateData['YSWS Project Submission'] = [yswsSubmissionId];
			}

			await projectsTable.update(projectRecord.id, updateData);

			const responseData = {
				success: true,
				message: 'Egg hatched successfully!',
				project: {
					id: projectRecord.id, // Use the actual record ID
					name: projectData.projectname,
					egg: creatureImage,
					status: 'submitted'
				}
			};

			return json(responseData);
		}

		if (reShip) {
			// Re-ship - update submission but DON'T change the creature image
			/** @type {any} */
			const updateData = {
				status: 'submitted',
				shippedDate: new Date().toISOString()
			};

			// Add YSWS submission link if provided - APPEND to existing submissions, don't replace
			if (yswsSubmissionId) {
				const existingSubmissions = projectData['YSWS Project Submission'];
				const submissionsArray = Array.isArray(existingSubmissions) ? existingSubmissions : [];
				updateData['YSWS Project Submission'] = [...submissionsArray, yswsSubmissionId];
			}

			await projectsTable.update(projectRecord.id, updateData);

			const responseData = {
				success: true,
				message: 'Project re-shipped successfully!',
				project: {
					id: projectRecord.id,
					name: projectData.projectname,
					egg: projectData.egg, // Keep existing creature image
					status: 'submitted'
				}
			};

			return json(responseData);
		}

		// Check if project is already submitted (only when actually shipping first time)
		if (shipProject && projectData.status === 'submitted') {
			return json(
				{
					success: false,
					error: { message: 'Project has already been submitted' }
				},
				{ status: 400 }
			);
		}

		// Validate that all required profile fields are filled before shipping
		if (shipProject) {
			const missingFields = [];

			if (
				!userInfo.username ||
				(typeof userInfo.username === 'string' && userInfo.username.trim() === '')
			) {
				missingFields.push('username');
			}
			if (
				!userInfo.githubUsername ||
				(typeof userInfo.githubUsername === 'string' && userInfo.githubUsername.trim() === '')
			) {
				missingFields.push('GitHub username');
			}
			if (
				!userInfo.howDidYouHear ||
				(typeof userInfo.howDidYouHear === 'string' && userInfo.howDidYouHear.trim() === '')
			) {
				missingFields.push('how you heard about this');
			}
			if (
				!userInfo.doingWell ||
				(typeof userInfo.doingWell === 'string' && userInfo.doingWell.trim() === '')
			) {
				missingFields.push('what we are doing well');
			}
			if (
				!userInfo.improve ||
				(typeof userInfo.improve === 'string' && userInfo.improve.trim() === '')
			) {
				missingFields.push('how we can improve');
			}

			if (missingFields.length > 0) {
				return json(
					{
						success: false,
						error: {
							message: `Please complete your profile before shipping. Missing: ${missingFields.join(', ')}. Go to your profile settings to fill these out.`
						}
					},
					{ status: 400 }
				);
			}

			// Check hours requirement based on whether project has been shipped before
			const shippedHours =
				typeof projectData.hoursShipped === 'number' ? projectData.hoursShipped : 0;
			const currentHours =
				typeof projectData.hackatimeHours === 'number' ? projectData.hackatimeHours : 0;

			console.log('Hours validation debug (shipProject only):', {
				shippedHours,
				currentHours,
				projectData
			});

			if (currentHours < 5) {
				// First time shipping - need at least 5 hours
				return json(
					{
						success: false,
						error: { message: 'At least 5 hackatime hours are required to ship' }
					},
					{ status: 400 }
				);
			} else if (shippedHours > 0 && currentHours < shippedHours + 5) {
				// Re-shipping - need 5 more hours since last shipment
				const hoursNeeded = shippedHours + 5;
				const hoursMore = hoursNeeded - currentHours;
				return json(
					{
						success: false,
						error: {
							message: `Need ${Math.round(hoursNeeded * 100) / 100} total hours to re-ship (currently at ${Math.round(currentHours * 100) / 100}, need ${Math.round(hoursMore * 100) / 100} more)`
						}
					},
					{ status: 400 }
				);
			}
		}

		// Ship the project by updating the status to "submitted"
		if (shipProject) {
			/** @type {any} */
			const updateData = {
				status: 'submitted',
				shippedDate: new Date().toISOString()
			};

			// Add YSWS submission link if provided
			if (yswsSubmissionId) {
				updateData['YSWS Project Submission'] = [yswsSubmissionId];
			}

			await projectsTable.update(projectRecord.id, updateData);
		}

		// Only calculate and award coins when actually shipping
		if (shipProject) {
			// Calculate coins earned (4-10 coins per hour, default to 8 for now)
			const hoursWorked =
				typeof projectData.hackatimeHours === 'number' ? projectData.hackatimeHours : 0;
			const coinsPerHour = 8; // Default rate, could be adjusted based on project quality
			const coinsEarned = Math.round(hoursWorked * coinsPerHour);

			// Convert pending hours to regular hours for this project
			// Get all devlogs associated with this project that have pending hours or streaks
			const devlogsTable = base('Devlogs');
			const devlogRecords = await devlogsTable
				.select({
					filterByFormula: `FIND("${projectRecord.id}", {projectIds})`
				})
				.all();

			let totalPendingCodeHours = 0;
			let totalPendingArtHours = 0;
			const devlogsToUpdate = [];
			const streakDevlogs = [];

			for (const devlog of devlogRecords) {
				const pendingCodeHours =
					typeof devlog.fields.pendingCodeHours === 'number' ? devlog.fields.pendingCodeHours : 0;
				const pendingArtHours =
					typeof devlog.fields.pendingArtHours === 'number' ? devlog.fields.pendingArtHours : 0;
				const hasPendingStreak = devlog.fields.pendingStreak === true;

				if (pendingCodeHours > 0 || pendingArtHours > 0 || hasPendingStreak) {
					if (pendingCodeHours > 0 || pendingArtHours > 0) {
						totalPendingCodeHours += pendingCodeHours;
						totalPendingArtHours += pendingArtHours;
					}

					if (hasPendingStreak) {
						streakDevlogs.push({
							id: devlog.id,
							title: devlog.fields.title || 'Untitled',
							streakValue: devlog.fields.streakValue || 0,
							streakContinued: devlog.fields.streakContinued || false,
							created: devlog.fields.Created
						});
					}

					devlogsToUpdate.push({
						id: devlog.id,
						pendingCodeHours,
						pendingArtHours,
						hasPendingStreak
					});
				}
			}

			// Update devlogs to convert pending hours and clear pending streaks
			for (const devlog of devlogsToUpdate) {
				const updateFields = {};

				if (devlog.pendingCodeHours > 0 || devlog.pendingArtHours > 0) {
					updateFields.pendingCodeHours = 0;
					updateFields.pendingArtHours = 0;
				}

				if (devlog.hasPendingStreak) {
					updateFields.pendingStreak = false;
				}

				if (Object.keys(updateFields).length > 0) {
					await devlogsTable.update(devlog.id, updateFields);
				}
			}

			// Save streak devlogs to the project
			if (streakDevlogs.length > 0) {
				await projectsTable.update(projectRecord.id, {
					streakDevlogs: JSON.stringify(streakDevlogs)
				});
			}

			// Update user's coins
			const usersTable = base('User');
			const userRecords = await usersTable
				.select({
					filterByFormula: `{email} = "${escapeAirtableFormula(typeof userInfo.email === 'string' ? userInfo.email : '')}"`
				})
				.all();

			if (userRecords.length > 0) {
				const userRecord = userRecords[0];
				const currentCoins =
					typeof userRecord.fields.coins === 'number' ? userRecord.fields.coins : 0;
				const newCoins = currentCoins + coinsEarned;

				await usersTable.update(userRecord.id, {
					coins: newCoins
				});
			}

			return json({
				success: true,
				message: 'Project shipped successfully!',
				coinsEarned: coinsEarned,
				pendingHoursConverted: {
					codeHours: totalPendingCodeHours,
					artHours: totalPendingArtHours,
					total: totalPendingCodeHours + totalPendingArtHours
				},
				streakDevlogs: {
					count: streakDevlogs.length,
					devlogs: streakDevlogs
				},
				project: {
					id: projectData.id,
					name: projectData.projectname,
					status: 'submitted',
					shippedDate: new Date().toISOString()
				}
			});
		}

		// This shouldn't be reached, but just in case
		return json(
			{
				success: false,
				error: { message: 'Invalid operation' }
			},
			{ status: 400 }
		);
	} catch (error) {
		console.error('Error shipping project:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to ship project';

		return json(
			{
				success: false,
				error: { message: errorMessage }
			},
			{ status: 500 }
		);
	}
}
