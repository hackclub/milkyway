import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { checkRateLimit, getClientIdentifier } from '$lib/server/security.js';

function hasPerm(user, perm) {
	const perms = user?.permissions;
	if (Array.isArray(perms)) return perms.includes(perm);
	if (typeof perms === 'string') return perms.split(',').map((p) => p.trim()).includes(perm);
	return false;
}

function hasLeaderboardAccess(user) {
	return (
		hasPerm(user, 'project reviewer') ||
		hasPerm(user, 'admin project reviewer')
	);
}

/**
 * @param {string} raw
 */
function parseScope(raw) {
	if (raw === '24h' || raw === '7d' || raw === 'all') return raw;
	return 'all';
}

/**
 * @param {string} scope
 */
function cutoffMsForScope(scope) {
	const now = Date.now();
	if (scope === '24h') return now - 24 * 60 * 60 * 1000;
	if (scope === '7d') return now - 7 * 24 * 60 * 60 * 1000;
	return null;
}

/**
 * @param {any} reviewField
 * @param {unknown} submittedAtField
 * @param {number | null} cutoffMs
 * @returns {string | null}
 */
function extractReviewerId(reviewField, submittedAtField, cutoffMs) {
	if (!Array.isArray(reviewField) || reviewField.length === 0) return null;
	const id = String(reviewField[0] || '');
	if (!id) return null;
	if (cutoffMs === null) return id;
	const t = new Date(String(submittedAtField || '')).getTime();
	if (!Number.isFinite(t) || t < cutoffMs) return null;
	return id;
}

export async function GET({ locals, request, cookies, url }) {
	try {
		if (!locals.user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		if (!hasLeaderboardAccess(locals.user)) {
			return json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const clientId = getClientIdentifier(request, cookies);
		if (!checkRateLimit(`project-review-leaderboard:${clientId}`, 60, 60000)) {
			return json({ success: false, error: 'Too many requests' }, { status: 429 });
		}

		const scope = parseScope(String(url.searchParams.get('scope') || 'all'));
		const cutoffMs = cutoffMsForScope(scope);

		const submissions = await base('YSWS Project Submission')
			.select({
				fields: [
					'projectReviewer1',
					'projectReviewer2',
					'projectReview1SubmittedAt',
					'projectReview2SubmittedAt'
				],
				maxRecords: 1000
			})
			.all();

		/** @type {Map<string, number>} */
		const counts = new Map();
		for (const s of submissions) {
			const f = s.fields;
			const r1 = extractReviewerId(f.projectReviewer1, f.projectReview1SubmittedAt, cutoffMs);
			const r2 = extractReviewerId(f.projectReviewer2, f.projectReview2SubmittedAt, cutoffMs);
			if (r1) counts.set(r1, (counts.get(r1) || 0) + 1);
			if (r2) counts.set(r2, (counts.get(r2) || 0) + 1);
		}

		const reviewerIds = Array.from(counts.keys());
		/** @type {Map<string, string>} */
		const nameById = new Map();
		for (let i = 0; i < reviewerIds.length; i += 8) {
			const batch = reviewerIds.slice(i, i + 8);
			if (batch.length === 0) continue;
			const filter = batch.map((id) => `RECORD_ID() = "${id}"`).join(', ');
			const users = await base('User').select({ filterByFormula: `OR(${filter})` }).all();
			for (const u of users) {
				nameById.set(u.id, String(u.fields.username || u.fields.email || u.id));
			}
		}

		const leaderboard = reviewerIds
			.map((id) => ({
				reviewerId: id,
				username: nameById.get(id) || id,
				reviews: counts.get(id) || 0
			}))
			.sort((a, b) => b.reviews - a.reviews)
			.slice(0, 50);

		return json({
			success: true,
			scope,
			leaderboard
		});
	} catch (error) {
		console.error('project reviewer leaderboard GET error:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch reviewer leaderboard'
			},
			{ status: 500 }
		);
	}
}
