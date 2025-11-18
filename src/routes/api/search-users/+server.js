import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { getUserProjectsByEmail } from '$lib/server/projects.js';
import { getUserFurnitureByEmail } from '$lib/server/furniture.js';
import {
	escapeAirtableFormula,
	checkRateLimit,
	getClientIdentifier
} from '$lib/server/security.js';

// GET /api/search-users?q=<query>&limit=<n>&includeProjects=true|false
export async function GET({ url, locals, request, cookies }) {
	if (!locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	// Rate limit: 60 requests per minute per client (search can be frequent but we still cap)
	const clientId = getClientIdentifier(request, cookies);
	if (!checkRateLimit(`search-users:${clientId}`, 60, 60000)) {
		return json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
	}

	try {
		const qRaw = url.searchParams.get('q') || '';
		const limitRaw = url.searchParams.get('limit') || '15';
		const includeProjects = url.searchParams.get('includeProjects') === 'true';
		const q = qRaw.trim();
		if (q.length < 2) {
			return json({ success: true, users: [] }); // require at least 2 chars
		}

		const escapedQuery = escapeAirtableFormula(q);
		const escapedEmail = escapeAirtableFormula(locals.user.email);
		const limit = Math.max(1, Math.min(parseInt(limitRaw, 10) || 15, 50));

		const records = await base('User')
			.select({
				filterByFormula: `AND({email} != "${escapedEmail}", FIND(LOWER("${escapedQuery}"), LOWER({username})) > 0)`,
				fields: ['username', 'email'],
				maxRecords: limit
			})
			.all();

		const users = [];
		for (const rec of records) {
			const username = String(rec.fields.username || '').trim();
			if (!username) continue;
			const email = String(rec.fields.email || '');
			let projects = [];
			let furniture = [];
			if (includeProjects) {
				projects = await getUserProjectsByEmail(email);
				furniture = await getUserFurnitureByEmail(email);
			}
			users.push({
				id: rec.id,
				username,
				projects,
				furniture
			});
		}

		return json({ success: true, users });
	} catch (err) {
		console.error('Error searching users:', err);
		return json({ error: 'Failed to search users' }, { status: 500 });
	}
}
