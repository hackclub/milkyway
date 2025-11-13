import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { escapeAirtableFormula } from '$lib/server/security.js';

/**
 * Get artlogs created TODAY for all user projects
 * Used by devlog system to track today's art hours
 */
export async function POST({ locals }) {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const email = locals.user.email;

		if (!email) {
			return json({ error: 'User email not found' }, { status: 400 });
		}

		const { getUserProjectsByEmail } = await import('$lib/server/projects.js');

		const allProjects = await getUserProjectsByEmail(email);

		if (allProjects.length === 0) {
			return json({
				success: true,
				artlogs: [],
				projectHours: {}
			});
		}

		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const todayStartISO = todayStart.toISOString();

		// Build a map of projectId -> projectName
		const projectMap = new Map();
		const projectRecordIds = [];

		for (const project of allProjects) {
			projectMap.set(project.id, {
				name: project.name,
				projectid: project.projectid || project.id
			});
			projectRecordIds.push(project.id);
		}

		const escapedProjectIds = projectRecordIds.map((id) => escapeAirtableFormula(String(id)));

		// airtable filter formula to find artlogs linked to ANY of the user's projects
		const projectFilters = escapedProjectIds.map(
			(id) => `FIND("|${id}|", "|" & ARRAYJOIN({Projects}, "|") & "|") > 0`
		);
		const projectFilterFormula = projectFilters.join(',');

		// now we can look for artlogs created today AND linked to the user's projects
		const filterFormula = `AND(
      OR(${projectFilterFormula}),
      IS_AFTER({Created}, "${todayStartISO}")
    )`;

		const records = await base('Artlog')
			.select({
				filterByFormula: filterFormula
			})
			.all();

		const artlogs = records.map((record) => {
			let imageUrl = '';
			const imageField = record.fields.image;
			if (imageField && Array.isArray(imageField) && imageField.length > 0) {
				imageUrl = String(imageField[0].url || '');
			}

			// projectid values and not record ids
			const linkedProjectIds = record.fields.Projects || [];

			return {
				id: record.id,
				hours: typeof record.fields.hours === 'number' ? record.fields.hours : 0,
				description: String(record.fields.description || ''),
				proof: String(record.fields.proof || ''),
				image: imageUrl,
				created: String(record.fields.Created || ''),
				projectIds: linkedProjectIds // projectid values
			};
		});

		const projectHours = {};

		for (const project of allProjects) {
			let totalHours = 0;

			// artlog.projectIds contains RECORD IDs
			for (const artlog of artlogs) {
				if (artlog.projectIds.includes(project.id)) {
					totalHours += artlog.hours;
				}
			}

			if (totalHours > 0) {
				projectHours[project.id] = {
					projectId: project.id,
					projectName: project.name,
					artHours: Math.round(totalHours * 100) / 100,
					artlogCount: artlogs.filter((a) => a.projectIds.includes(project.id)).length
				};
			}
		}

		return json({
			success: true,
			artlogs,
			projectHours, // map of projectId -> { projectName, artHours, artlogCount }
			totalArtHours:
				Math.round(Object.values(projectHours).reduce((sum, p) => sum + p.artHours, 0) * 100) / 100
		});
	} catch (error) {
		console.error('Error in get-artlogs-today API:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch art hours',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}
