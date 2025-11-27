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

		// 1) Fetch user's projects and build ID->meta map (support both record.id and projectid)
		const projectsForUser = await getUserProjectsByEmail(userInfo.email);
		const projectIdToMeta = new Map();
		for (const p of projectsForUser) {
			const meta = {
				name: p.name || 'Untitled Project',
				githubURL: p.githubURL || '',
				shipURL: p.shipURL || ''
			};
			if (p?.id) projectIdToMeta.set(String(p.id), meta);
			if (p?.projectid) projectIdToMeta.set(String(p.projectid), meta);
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

			const projectMeta = projectIds
				.map((id) => projectIdToMeta.get(id) || null)
				.map((m, idx) => {
					// If we don't have meta, fall back to the mapped name if available
					if (m) return m;
					const fallbackName = projectIdToMeta.get(projectIds[idx])?.name || null;
					return fallbackName || projectIds[idx];
				})
				.filter((v) => v !== null && v !== undefined);

			let comments = [];
			if (record.fields.comments) {
				try {
					comments = JSON.parse(record.fields.comments);
					if (!Array.isArray(comments)) {
						comments = [];
					}
				} catch (e) {
					console.error('Failed to parse comments for devlog:', record.id, e);
					comments = [];
				}
			}

			let likes = [];
			if (record.fields.likes) {
				try {
					likes = JSON.parse(record.fields.likes);
					if (!Array.isArray(likes)) {
						likes = [];
					}
				} catch (e) {
					console.error('Failed to parse likes for devlog:', record.id, e);
					likes = [];
				}
			}

			return {
				id: record.id,
				title: record.fields.title,
				content: record.fields.content,
				hours: typeof record.fields.hours === 'number' ? record.fields.hours : 0,
				projects: projectMeta, // return project meta (name and URLs) when available
				attachments: record.fields.attachments,
				created: record.fields.Created,
				comments: comments,
				likes: likes
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
