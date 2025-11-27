import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { checkRateLimit, getClientIdentifier } from '$lib/server/security.js';

export async function GET({ request, cookies }) {
	try {
		const clientId = getClientIdentifier(request, cookies);
		if (!checkRateLimit(`all-devlogs:${clientId}`, 50, 60000)) {
			return json(
				{
					success: false,
					error: 'Too many requests. Please try again later.'
				},
				{ status: 429 }
			);
		}
		const allRecords = await base('Devlogs')
			.select({
				sort: [{ field: 'Created', direction: 'desc' }]
			})
			.all();
		const devlogs = allRecords.map((record) => {
			const userIds = record.fields.user || [];
			const userId = Array.isArray(userIds) && userIds.length > 0 ? userIds[0] : null;
			const projectIdsRaw = record.fields.projectIds;
			const projectIds =
				typeof projectIdsRaw === 'string'
					? projectIdsRaw
							.split(',')
							.map((id) => id.trim())
							.filter(Boolean)
					: [];
			let comments = [];
			if (record.fields.comments && typeof record.fields.comments === 'string') {
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
			if (record.fields.likes && typeof record.fields.likes === 'string') {
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
				userId: userId,
				title: record.fields.title,
				content: record.fields.content,
				hours: typeof record.fields.hours === 'number' ? record.fields.hours : 0,
				codeHours: typeof record.fields.codeHours === 'number' ? record.fields.codeHours : 0,
				artHours: typeof record.fields.artHours === 'number' ? record.fields.artHours : 0,
				projectIds: projectIds,
				attachments: record.fields.attachments || [],
				created: record.fields.Created,
				comments: comments,
				likes: likes,
				pendingStreak: record.fields.pendingStreak || false,
				streakValue: record.fields.streakValue || 0
			};
		});
		return json({
			success: true,
			devlogs,
			count: devlogs.length
		});
	} catch (err) {
		console.error('Error fetching all devlogs:', err);
		const errorMessage = err instanceof Error ? err.message : 'Failed to get devlogs';

		return json(
			{
				success: false,
				error: { message: errorMessage }
			},
			{ status: 500 }
		);
	}
}
