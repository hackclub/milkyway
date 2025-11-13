import { json } from '@sveltejs/kit';
import { getUserInfoByUsername } from '$lib/server/auth.js';
import { base } from '$lib/server/db.js';
import { checkRateLimit, getClientIdentifier } from '$lib/server/security.js';
import { getUserProjectsByEmail } from '$lib/server/projects.js';

export async function POST({ cookies, request }) {
	try {
		// Rate limiting: 100 requests per minute per client
		const clientId = getClientIdentifier(request, cookies);
		if (!checkRateLimit(`user-devlogs:${clientId}`, 100, 60000)) {
			return json(
				{
					success: false,
					error: 'Too many requests. Please try again later.'
				},
				{ status: 429 }
			);
		}

		const body = await request.json();
		const username = body.username;

		if (!username) {
			return json({ success: false, error: 'Username is required' }, { status: 400 });
		}

		const userInfo = await getUserInfoByUsername(username);
		if (!userInfo) {
			return json({ success: false, error: 'User not found' }, { status: 404 });
		}

		// 1) Fetch user's projects and build ID->Name map (support both record.id and projectid)
		const projectsForUser = await getUserProjectsByEmail(userInfo.email);
		const projectIdToName = new Map();
		for (const p of projectsForUser) {
			if (p?.id) projectIdToName.set(String(p.id), p.name || 'Untitled Project');
			if (p?.projectid) projectIdToName.set(String(p.projectid), p.name || 'Untitled Project');
		}

		// 2) Fetch user's devlogs (in-memory filtering on linked 'user' field)
		const allRecords = await base('Devlogs')
			.select({
				sort: [{ field: 'Created', direction: 'desc' }]
			})
			.all();

		const userRecords = allRecords.filter((record) => {
			const userIds = record.fields.user || [];
			return Array.isArray(userIds) && userIds.includes(userInfo.recId);
		});

		// 3) Map projectIds to human names
		const devlogs = userRecords.map((record) => {
			const projectIdsRaw = record.fields.projectIds;
			const projectIds =
				typeof projectIdsRaw === 'string'
					? projectIdsRaw
							.split(',')
							.map((id) => id.trim())
							.filter(Boolean)
					: [];

			const projectNames = projectIds
				.map((id) => projectIdToName.get(id))
				.filter((name) => typeof name === 'string' && name.length > 0);

			return {
				id: record.id,
				title: record.fields.title,
				content: record.fields.content,
				hours: typeof record.fields.hours === 'number' ? record.fields.hours : 0,
				projects: projectNames, // return names only
				attachments: record.fields.attachments,
				created: record.fields.Created
			};
		});

		return json({
			success: true,
			devlogs
		});
	} catch (err) {
		console.error('Error fetching user devlogs:', err);
		const errorMessage = err instanceof Error ? err.message : 'Failed to get user devlogs';

		return json(
			{
				success: false,
				error: { message: errorMessage }
			},
			{ status: 500 }
		);
	}
}
