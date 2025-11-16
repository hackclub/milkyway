import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';

export async function GET({ cookies, url }) {
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

		const projectId = url.searchParams.get('projectId');

		if (!projectId) {
			return json(
				{
					success: false,
					error: { message: 'Project ID required' }
				},
				{ status: 400 }
			);
		}

		// Get the project to verify ownership
		const projectsTable = base('Projects');
		const projectRecord = await projectsTable.find(projectId);
		const projectData = projectRecord.fields;

		// Validate that the project belongs to the current user
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

		// Get all devlogs associated with this project that have pending hours
		const devlogsTable = base('Devlogs');
		const devlogRecords = await devlogsTable
			.select({
				filterByFormula: `FIND("${projectId}", {projectIds})`
			})
			.all();

		let totalPendingCodeHours = 0;
		let totalPendingArtHours = 0;
		const pendingStreakDevlogs = [];

		for (const devlog of devlogRecords) {
			const pendingCodeHours =
				typeof devlog.fields.pendingCodeHours === 'number' ? devlog.fields.pendingCodeHours : 0;
			const pendingArtHours =
				typeof devlog.fields.pendingArtHours === 'number' ? devlog.fields.pendingArtHours : 0;
			const hasPendingStreak = devlog.fields.pendingStreak === true;

			totalPendingCodeHours += pendingCodeHours;
			totalPendingArtHours += pendingArtHours;

			if (hasPendingStreak) {
				pendingStreakDevlogs.push({
					id: devlog.id,
					title: devlog.fields.title || 'Untitled',
					streakValue: devlog.fields.streakValue || 0,
					streakContinued: devlog.fields.streakContinued || false,
					created: devlog.fields.Created
				});
			}
		}

		return json({
			success: true,
			pendingHours: {
				codeHours: Math.round(totalPendingCodeHours * 100) / 100,
				artHours: Math.round(totalPendingArtHours * 100) / 100,
				total: Math.round((totalPendingCodeHours + totalPendingArtHours) * 100) / 100
			},
			pendingStreaks: {
				count: pendingStreakDevlogs.length,
				devlogs: pendingStreakDevlogs
			}
		});
	} catch (error) {
		console.error('Error fetching pending hours:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to fetch pending hours';

		return json(
			{
				success: false,
				error: { message: errorMessage }
			},
			{ status: 500 }
		);
	}
}
