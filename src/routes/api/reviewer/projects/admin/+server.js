import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { checkRateLimit, getClientIdentifier } from '$lib/server/security.js';
import { fetchYswsSubmissionsForProject } from '$lib/server/ysws-submissions-for-project.js';

function hasPerm(user, perm) {
	const perms = user?.permissions;
	if (Array.isArray(perms)) return perms.includes(perm);
	if (typeof perms === 'string') {
		return perms.split(',').map((p) => p.trim()).includes(perm);
	}
	return false;
}

function getCreatedIso(record) {
	return String(record.fields.Created || record._rawJson?.createdTime || '');
}

function getProjectId(record) {
	const projectField = record.fields.projectEgg;
	if (Array.isArray(projectField) && projectField.length > 0) return String(projectField[0]);
	if (projectField) return String(projectField);
	return '';
}

function isAdminFinalized(record) {
	const f = record.fields;
	const notesToUser = String(f.notesToUser || '').trim();
	const hasAdminTimestamp = String(f.projectAdminSubmittedAt || '').trim().length > 0;
	return (
		notesToUser.length > 0 ||
		Number(f.coinsAwarded || 0) > 0 ||
		!!f.needfix ||
		hasAdminTimestamp
	);
}

function getPassCount(record) {
	const f = record.fields;
	const r1 = Array.isArray(f.projectReviewer1) && f.projectReviewer1.length > 0;
	const r2 = Array.isArray(f.projectReviewer2) && f.projectReviewer2.length > 0;
	return (r1 ? 1 : 0) + (r2 ? 1 : 0);
}

/**
 * @param {Record<string, unknown>} f
 */
function isApprovedSubmissionFields(f) {
	if (f.needfix) return false;
	if (Number(f.coinsAwarded || 0) > 0) return true;
	if (String(f.projectAdminSubmittedAt || '').trim()) return true;
	const ar = String(f.awardingResults || '').trim().toLowerCase();
	if (ar === 'done!') return true;
	return false;
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function parseHackatimeProjectNames(raw) {
	if (raw == null) return [];
	if (Array.isArray(raw)) {
		return raw.map((x) => String(x).trim()).filter(Boolean);
	}
	const s = String(raw).trim();
	if (!s) return [];
	return s.split(/,\s*/).map((x) => x.trim()).filter(Boolean);
}

function pickLatestPerProject(records) {
	/** @type {Map<string, any>} */
	const map = new Map();
	for (const r of records) {
		const projectId = getProjectId(r);
		if (!projectId) continue;
		const curr = map.get(projectId);
		const t = new Date(getCreatedIso(r)).getTime();
		const c = curr ? new Date(getCreatedIso(curr)).getTime() : -1;
		if (!curr || t > c) map.set(projectId, r);
	}
	return Array.from(map.values());
}

async function buildAdminBundle(submission) {
	const projectId = getProjectId(submission);
	const project = projectId ? await base('Projects').find(projectId) : null;
	const pf = project?.fields || {};

	const userId = Array.isArray(pf.user) && pf.user.length > 0 ? String(pf.user[0]) : '';
	const userRec = userId ? await base('User').find(userId) : null;
	const uf = userRec?.fields || {};

	const previousSubs = projectId
		? await fetchYswsSubmissionsForProject(projectId, pf, { maxRecords: 50 })
		: [];

	const olderSubs = previousSubs.filter((s) => s.id !== submission.id);
	const lastApproved = olderSubs.find((s) => isApprovedSubmissionFields(s.fields));
	const baselineHoursLogged = lastApproved ? Number(lastApproved.fields.hoursLogged || 0) : 0;

	const curHt = Number(pf.hackatimeHours || 0);
	const curArt = Number(pf.artHours || 0);
	const curTotal = curHt + curArt;
	const hoursSinceLastApproved = Math.max(
		0,
		Math.round((curTotal - baselineHoursLogged) * 100) / 100
	);
	let newHackatimeHours = 0;
	let newArtHours = 0;
	if (hoursSinceLastApproved > 0 && curTotal > 0) {
		newHackatimeHours = Math.round((hoursSinceLastApproved * (curHt / curTotal)) * 100) / 100;
		newArtHours = Math.round((hoursSinceLastApproved - newHackatimeHours) * 100) / 100;
	} else if (hoursSinceLastApproved > 0) {
		newArtHours = hoursSinceLastApproved;
	}

	return {
		id: submission.id,
		created: getCreatedIso(submission),
		project: {
			id: project?.id || projectId,
			name: String(pf.projectname || 'Untitled project'),
			description: String(pf.description || ''),
			shipURL: String(pf.shipURL || ''),
			githubURL: String(pf.githubURL || ''),
			image: Array.isArray(pf.image) && pf.image[0]?.url ? String(pf.image[0].url) : '',
			hackatimeHours: curHt,
			artHours: curArt,
			totalHours: curTotal,
			newHackatimeHoursSinceLastApproved: newHackatimeHours,
			newArtHoursSinceLastApproved: newArtHours,
			newTotalHoursSinceLastApproved: hoursSinceLastApproved,
			hackatimeProjectNames: parseHackatimeProjectNames(pf.hackatimeProjects)
		},
		submission: {
			additionalComments: {
				notMadeBy: String(
					pf.notMadeBy || submission.fields.notMadeBy || submission.fields['What parts were not made by you?'] || ''
				),
				howToPlay: String(
					pf.howToPlay || submission.fields.howToPlay || submission.fields['How do you play this project?'] || ''
				),
				sinceLastSubmission: String(
					submission.fields['addnComments archive'] ||
						submission.fields.sinceLastSubmission ||
						submission.fields['How much did you add since your last submission?'] ||
						submission.fields.addnComments ||
						pf.addnComments ||
						''
				)
			}
		},
		user: {
			username: String(uf.username || ''),
			email: String(uf.email || ''),
			profileUrl: uf.username ? `/u/${encodeURIComponent(String(uf.username))}` : ''
		},
		reviews: {
			review1: {
				estimatedHoursFeel: String(submission.fields.projectReview1EstimatedHoursFeel || ''),
				coins: Number(submission.fields.projectReview1Coins || 0),
				feedback: String(submission.fields.projectReview1Feedback || ''),
				suspicious: !!submission.fields.projectReview1Suspicious
			},
			review2: {
				estimatedHoursFeel: String(submission.fields.projectReview2EstimatedHoursFeel || ''),
				coins: Number(submission.fields.projectReview2Coins || 0),
				feedback: String(submission.fields.projectReview2Feedback || ''),
				suspicious: !!submission.fields.projectReview2Suspicious
			}
		},
		isSuspicious:
			!!submission.fields.projectReview1Suspicious || !!submission.fields.projectReview2Suspicious,
		previousSubmissions: previousSubs.map((s) => ({
			id: s.id,
			created: getCreatedIso(s),
			notesToUser: String(s.fields.notesToUser || ''),
			coinsAwarded: Number(s.fields.coinsAwarded || 0)
		}))
	};
}

export async function GET({ locals, request, cookies }) {
	try {
		if (!locals.user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		if (!hasPerm(locals.user, 'admin project reviewer')) {
			return json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const clientId = getClientIdentifier(request, cookies);
		if (!checkRateLimit(`admin-project-review-next:${clientId}`, 60, 60000)) {
			return json({ success: false, error: 'Too many requests' }, { status: 429 });
		}

		const all = await base('YSWS Project Submission')
			.select({ sort: [{ field: 'Created', direction: 'desc' }], maxRecords: 500 })
			.all();

		const unfinalized = all.filter((r) => !isAdminFinalized(r));
		const latestPerProject = pickLatestPerProject(unfinalized);

		latestPerProject.sort((a, b) => {
			const passDelta = getPassCount(b) - getPassCount(a);
			if (passDelta !== 0) return passDelta;
			return new Date(getCreatedIso(b)).getTime() - new Date(getCreatedIso(a)).getTime();
		});

		let withOne = 0;
		let withTwo = 0;
		for (const r of latestPerProject) {
			const p = getPassCount(r);
			if (p === 1) withOne += 1;
			else if (p === 2) withTwo += 1;
		}
		const stats = {
			projectsLeft: latestPerProject.length,
			projectsWithOneReviewer: withOne,
			projectsWithTwoReviewers: withTwo
		};

		if (latestPerProject.length === 0) {
			return json({ success: true, projects: [], stats });
		}

		const bundles = await Promise.all(
			latestPerProject.map(async (record) => {
				const item = await buildAdminBundle(record);
				return {
					...item,
					passCount: getPassCount(record)
				};
			})
		);

		return json({ success: true, projects: bundles, stats });
	} catch (e) {
		console.error('admin project reviewer GET error:', e);
		return json({ success: false, error: 'Failed to fetch admin review project' }, { status: 500 });
	}
}

export async function POST({ locals, request, cookies }) {
	try {
		if (!locals.user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		if (!hasPerm(locals.user, 'admin project reviewer')) {
			return json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const clientId = getClientIdentifier(request, cookies);
		if (!checkRateLimit(`admin-project-review-submit:${clientId}`, 80, 60000)) {
			return json({ success: false, error: 'Too many requests' }, { status: 429 });
		}

		const body = await request.json();
		const submissionId = String(body?.submissionId || '');
		const action = String(body?.action || 'finish');
		if (!submissionId) return json({ success: false, error: 'submissionId required' }, { status: 400 });
		if (action === 'skip') return json({ success: true });

		const needFix = !!body?.needFix;
		const coinsAwarded = Number(body?.coinsAwarded || 0);
		const notesToUser = String(body?.notesToUser || '').trim();
		const dbJustification = String(body?.dbJustification || '').trim();
		const dbHoursRaw = body?.dbHours;
		const hasDbHours = dbHoursRaw !== null && dbHoursRaw !== undefined && String(dbHoursRaw).trim() !== '';
		const dbHours = hasDbHours ? Number(dbHoursRaw) : null;

		if (!Number.isFinite(coinsAwarded) || coinsAwarded < 0) {
			return json({ success: false, error: 'coinsAwarded must be non-negative' }, { status: 400 });
		}
		if (hasDbHours && (!Number.isFinite(dbHours) || Number(dbHours) < 0)) {
			return json({ success: false, error: 'dbHours must be a non-negative number' }, { status: 400 });
		}
		if (!notesToUser) {
			return json({ success: false, error: 'feedback is required' }, { status: 400 });
		}

		const now = new Date();
		now.setSeconds(0, 0);
		const nowIso = now.toISOString();

		/** @type {any} */
		const updateFields = {
			coinsAwarded: needFix ? 0 : coinsAwarded,
			notesToUser,
			projectAdminReviewer: locals.user.recId ? [locals.user.recId] : [],
			projectAdminSubmittedAt: nowIso,
			needfix: needFix,
			'Award Coins to User': !needFix
		};

		if (!needFix && hasDbHours) {
			updateFields['Optional - Override Hours Spent'] = Number(dbHours);
		}
		if (!needFix && dbJustification) {
			updateFields['Optional - Override Hours Spent Justification'] = dbJustification;
		}

		await base('YSWS Project Submission').update(submissionId, updateFields);

		// Deletion intentionally disabled for safety.
		// Keep records intact; queue logic already shows latest submission per project.

		return json({ success: true });
	} catch (e) {
		console.error('admin project reviewer POST error:', e);
		return json({ success: false, error: 'Failed to save admin project review' }, { status: 500 });
	}
}
