import { base } from '$lib/server/db.js';
import { sanitizeUserForFrontend } from '$lib/server/auth.js';

export async function load({ url, locals }) {
	const params = url.searchParams;
	const page = Math.max(1, parseInt(params.get('page') || '1'));
	const limit = Math.min(100, Math.max(5, parseInt(params.get('limit') || '20')));
	const sort = params.get('sort') || 'newest';
	try {
		const allRecords = await base('Devlogs')
			.select({ sort: [{ field: 'Created', direction: 'desc' }] })
			.all();
		const now = new Date();
		const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		const normalized = allRecords.map((record) => {
			const userIds = record.fields.user || [];
			const userId = Array.isArray(userIds) && userIds.length > 0 ? userIds[0] : null;
			const projectIdsRaw = record.fields.projectIds;
			const projectIds = typeof projectIdsRaw === 'string'
				? projectIdsRaw.split(',').map((id) => id.trim()).filter(Boolean)
				: [];
			let comments = [];
			if (record.fields.comments && typeof record.fields.comments === 'string') {
				try { comments = JSON.parse(record.fields.comments); } catch (e) { comments = []; }
				if (!Array.isArray(comments)) comments = [];
			}
			let likes = [];
			if (record.fields.likes && typeof record.fields.likes === 'string') {
				try { likes = JSON.parse(record.fields.likes); } catch (e) { likes = []; }
				if (!Array.isArray(likes)) likes = [];
			}
			const created = record.fields.Created && typeof record.fields.Created === 'string' ? new Date(record.fields.Created) : null;
			return {
				id: record.id,
				userId,
				title: record.fields.title,
				content: record.fields.content,
				hours: typeof record.fields.hours === 'number' ? record.fields.hours : 0,
				projectIds,
				attachments: record.fields.attachments || [],
				created,
				createdISO: record.fields.Created,
				comments,
				likes,
				likesCount: likes.length,
				commentsCount: comments.length,
				pendingStreak: record.fields.pendingStreak || false,
				streakValue: record.fields.streakValue || 0,
				isThisWeek: created ? created >= sevenDaysAgo : false
			};
		});
		let filtered = normalized;
		if (sort === 'likes-week' || sort === 'comments-week') {
			filtered = normalized.filter((d) => d.isThisWeek);
		}
		switch (sort) {
			case 'top-likes':
				filtered.sort((a, b) => b.likesCount - a.likesCount || (b.created?.getTime() || 0) - (a.created?.getTime() || 0));
				break;
			case 'top-comments':
				filtered.sort((a, b) => b.commentsCount - a.commentsCount || (b.created?.getTime() || 0) - (a.created?.getTime() || 0));
				break;
			case 'likes-week':
				filtered.sort((a, b) => b.likesCount - a.likesCount || (b.created?.getTime() || 0) - (a.created?.getTime() || 0));
				break;
			case 'comments-week':
				filtered.sort((a, b) => b.commentsCount - a.commentsCount || (b.created?.getTime() || 0) - (a.created?.getTime() || 0));
				break;
			case 'newest':
			default:
				filtered.sort((a, b) => (b.created?.getTime() || 0) - (a.created?.getTime() || 0));
				break;
		}
		const totalCount = filtered.length;
		const start = (page - 1) * limit;
		const paged = filtered.slice(start, start + limit);
		const uniqueUserIds = [...new Set(paged.map((d) => d.userId).filter(Boolean))];
		const userMap = new Map();
		for (const uid of uniqueUserIds) {
			try {
				const userRec = await base('User').find(uid);
				if (userRec) {
					userMap.set(uid, {
						username: userRec.fields.username || 'Anonymous',
						githubUsername: userRec.fields.githubUsername || '',
						devlogStreak: typeof userRec.fields.devlogStreak === 'number' ? userRec.fields.devlogStreak : (userRec.fields.devlogStreak || 0)
					});
				}
			} catch (e) {
				console.error('Failed to fetch user', uid, e);
			}
		}
		const allProjectIds = [...new Set(paged.flatMap((d) => d.projectIds || []))];
		const projectMap = new Map();
		for (const pid of allProjectIds) {
			try {
				const proj = await base('Projects').find(pid);
				if (proj) {
					projectMap.set(pid, {
						name: proj.fields.projectname || proj.fields.name || pid,
						githubURL: proj.fields.githubURL || '',
						shipURL: proj.fields.shipURL || ''
					});
				}
			} catch (e) {
				console.error('Failed to fetch project', pid, e);
			}
		}
		const enriched = paged.map((d) => {
			const userInfo = userMap.get(d.userId) || { username: 'Anonymous', githubUsername: '', devlogStreak: 0 };
			const projectMeta = (d.projectIds || []).map((pid) => {
				const meta = projectMap.get(pid) || { name: pid, githubURL: '', shipURL: '' };
				return {
					...meta,
					githubURL: meta.githubURL && !meta.githubURL.startsWith('http') ? `https://${meta.githubURL}` : meta.githubURL,
					shipURL: meta.shipURL && !meta.shipURL.startsWith('http') ? `https://${meta.shipURL}` : meta.shipURL
				};
			});
			return {
				...d,
				username: userInfo.username,
				userProfile: `/u/${encodeURIComponent(userInfo.username)}`,
				userGithub: userInfo.githubUsername ? `https://github.com/${userInfo.githubUsername}` : '',
				userDevlogStreak: userInfo.devlogStreak || 0,
				projects: projectMeta
			};
		});
		return {
			devlogs: enriched,
			totalCount,
			page,
			limit,
			sort,
			user: sanitizeUserForFrontend(locals.user)
		};
	} catch (error) {
		console.error('Error loading devlogs page:', error);
		return {
			devlogs: [],
			totalCount: 0,
			page: 1,
			limit: 20,
			sort: 'newest',
			error: error instanceof Error ? error.message : 'Failed to load devlogs',
			user: sanitizeUserForFrontend(locals.user)
		};
	}
}
