import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import {
	checkRateLimit,
	escapeAirtableFormula,
	getClientIdentifier
} from '$lib/server/security.js';
import {
	fetchYswsSubmissionsForProject,
	getYswsSubmissionHoursLogged
} from '$lib/server/ysws-submissions-for-project.js';

function hasPerm(user, perm) {
	const perms = user?.permissions;
	if (Array.isArray(perms)) return perms.includes(perm);
	if (typeof perms === 'string') {
		return perms.split(',').map((p) => p.trim()).includes(perm);
	}
	return false;
}

function getCreatedIso(record) {
	// Prefer Airtable record createdTime from YSWS rows for stable queue ordering.
	return String(record._rawJson?.createdTime || record.fields.Created || '');
}

/**
 * @param {any} record
 */
function getCreatedMs(record) {
	const t = new Date(getCreatedIso(record)).getTime();
	return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

function isWaitingForReview(record) {
	const f = record.fields;
	const notesToUser = String(f.notesToUser || '').trim();
	const awardingResults = String(f.awardingResults || '').trim().toLowerCase();
	return notesToUser.length === 0 && (awardingResults.length === 0 || awardingResults === 'waiting...');
}

function getReviewerIdAt(record, idx) {
	const field = idx === 1 ? record.fields.projectReviewer1 : record.fields.projectReviewer2;
	if (!Array.isArray(field) || field.length === 0) return '';
	return String(field[0]);
}

function getPassCount(record) {
	const r1 = getReviewerIdAt(record, 1);
	const r2 = getReviewerIdAt(record, 2);
	return (r1 ? 1 : 0) + (r2 ? 1 : 0);
}

/**
 * @param {string} raw
 * @returns {Set<string>}
 */
function parseExcludeIds(raw) {
	const set = new Set();
	if (!raw || typeof raw !== 'string') return set;
	for (const part of raw.split(',')) {
		const id = part.trim();
		if (/^rec[a-zA-Z0-9]{14}$/.test(id)) set.add(id);
	}
	return set;
}

function getProjectId(record) {
	const projectField = record.fields.projectEgg;
	if (Array.isArray(projectField) && projectField.length > 0) return String(projectField[0]);
	if (projectField) return String(projectField);
	return '';
}

function pickLatestPerProject(records) {
	const map = new Map();
	for (const r of records) {
		const projectId = getProjectId(r);
		if (!projectId) continue;
		const curr = map.get(projectId);
		const t = getCreatedMs(r);
		const c = curr ? getCreatedMs(curr) : -1;
		if (!curr || t > c) map.set(projectId, r);
	}
	return Array.from(map.values());
}

/**
 * Submission counts as admin-approved for baseline hours / history.
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
 * @param {any[]} subs Same-project submissions (any order)
 * @param {string} currentSubmissionId
 */
function computeReviewContext(subs, currentSubmissionId) {
	const sorted = subs.slice().sort((a, b) => {
		return new Date(getCreatedIso(b)).getTime() - new Date(getCreatedIso(a)).getTime();
	});

	let totalCoinsPreviouslyAwarded = 0;
	for (const s of sorted) {
		if (s.id === currentSubmissionId) continue;
		totalCoinsPreviouslyAwarded += Number(s.fields.coinsAwarded || 0);
	}

	// "Last ship" baseline = YSWS `hoursLogged` on the row immediately before this one (by created time).
	const sortedAsc = subs.slice().sort((a, b) => {
		return new Date(getCreatedIso(a)).getTime() - new Date(getCreatedIso(b)).getTime();
	});
	const idx = sortedAsc.findIndex((s) => s.id === currentSubmissionId);
	const immediatePrior = idx > 0 ? sortedAsc[idx - 1] : null;
	const baselineHoursLogged = immediatePrior ? getYswsSubmissionHoursLogged(immediatePrior) : 0;

	return { sorted, totalCoinsPreviouslyAwarded, baselineHoursLogged, priorSubmissionId: immediatePrior?.id || null };
}

async function buildProjectBundle(submission) {
	const projectId = getProjectId(submission);
	const project = projectId ? await base('Projects').find(projectId) : null;
	const pf = project?.fields || {};

	const userId = Array.isArray(pf.user) && pf.user.length > 0 ? String(pf.user[0]) : '';
	const userRec = userId ? await base('User').find(userId) : null;
	const uf = userRec?.fields || {};

	// Artlog -> Projects linked field may store project's primary field value.
	// Use projectid primary value first, with record ID as fallback.
	const projectPrimaryId = String(pf.projectid || projectId || '');
	const escapedProjectPrimaryId = escapeAirtableFormula(projectPrimaryId);

	const artlogs = projectId
		? await base('Artlog')
				.select({
					filterByFormula: `FIND("|${escapedProjectPrimaryId}|", "|" & ARRAYJOIN({Projects}, "|") & "|") > 0`,
					sort: [{ field: 'Created', direction: 'desc' }],
					maxRecords: 5
				})
				.all()
		: [];

	const previousSubs = projectId ? await fetchYswsSubmissionsForProject(projectId, pf) : [];

	const reviewCtx = computeReviewContext(previousSubs, submission.id);
	const curHt = Number(pf.hackatimeHours || 0);
	const curArt = Number(pf.artHours || 0);
	const curTotal = curHt + curArt;
	const hoursSincePriorSubmission = Math.max(
		0,
		Math.round((curTotal - reviewCtx.baselineHoursLogged) * 100) / 100
	);
	let newHackatimeHours = 0;
	let newArtHours = 0;
	if (hoursSincePriorSubmission > 0 && curTotal > 0) {
		newHackatimeHours = Math.round((hoursSincePriorSubmission * (curHt / curTotal)) * 100) / 100;
		newArtHours = Math.round((hoursSincePriorSubmission - newHackatimeHours) * 100) / 100;
	} else if (hoursSincePriorSubmission > 0) {
		newArtHours = hoursSincePriorSubmission;
	}

	const otherProjects = userId
		? await base('Projects')
				.select({
					filterByFormula: `FIND("${escapeAirtableFormula(userId)}", ARRAYJOIN({user}, ",")) > 0`,
					sort: [{ field: 'Created', direction: 'desc' }],
					maxRecords: 20
				})
				.all()
		: [];

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
			newTotalHoursSinceLastApproved: hoursSincePriorSubmission,
			baselineHoursAtPriorSubmission: reviewCtx.baselineHoursLogged,
			totalCoinsPreviouslyAwarded: reviewCtx.totalCoinsPreviouslyAwarded
		},
		submission: {
			hoursLogged: getYswsSubmissionHoursLogged(submission),
			additionalComments: {
				notMadeBy: String(
					pf.notMadeBy || submission.fields.notMadeBy || submission.fields['What parts were not made by you?'] || ''
				),
				howToPlay: String(
					pf.howToPlay || submission.fields.howToPlay || submission.fields['How do you play this project?'] || ''
				),
				addnComments: String(
					pf.addnComments || submission.fields.addnComments || submission.fields['Additional comments'] || ''
				),
				sinceLastSubmission: String(
					submission.fields['addnComments archive'] ||
						submission.fields.sinceLastSubmission ||
						submission.fields['How much did you add since your last submission?'] ||
						pf.addnComments ||
						''
				)
			}
		},
		user: {
			id: userRec?.id || '',
			username: String(uf.username || ''),
			profileUrl: uf.username ? `/u/${encodeURIComponent(String(uf.username))}` : ''
		},
		artlogs: artlogs.map((a) => ({
			id: a.id,
			created: getCreatedIso(a),
			hours: Number(a.fields.hours || 0),
			approvedHours:
				typeof a.fields.approvedHours === 'number' ? Number(a.fields.approvedHours) : null,
			description: String(a.fields.description || ''),
			proof: String(a.fields.proof || ''),
			image: Array.isArray(a.fields.image) && a.fields.image[0]?.url ? String(a.fields.image[0].url) : ''
		})),
		previousSubmissions: reviewCtx.sorted
			.filter((s) => s.id !== submission.id)
			.map((s) => {
				const sf = s.fields;
				return {
					id: s.id,
					created: getCreatedIso(s),
					hoursLogged: getYswsSubmissionHoursLogged(s),
					notesToUser: String(sf.notesToUser || ''),
					coinsAwarded: Number(sf.coinsAwarded || 0),
					awardingResults: String(sf.awardingResults || ''),
					wasAdminApproved: isApprovedSubmissionFields(sf),
					sinceLastSubmission: String(
						sf['addnComments archive'] ||
							sf.sinceLastSubmission ||
							sf['How much did you add since your last submission?'] ||
							sf.addnComments ||
							''
					),
					notMadeBy: String(sf.notMadeBy || ''),
					howToPlay: String(sf.howToPlay || ''),
					addnComments: String(sf.addnComments || ''),
					review1Feedback: String(sf.projectReview1Feedback || ''),
					review2Feedback: String(sf.projectReview2Feedback || '')
				};
			}),
		otherProjects: otherProjects.map((p) => ({
			id: p.id,
			name: String(p.fields.projectname || 'Untitled'),
			shipURL: String(p.fields.shipURL || ''),
			githubURL: String(p.fields.githubURL || '')
		}))
	};
}

export async function GET({ locals, request, cookies, url }) {
	try {
		if (!locals.user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		if (!hasPerm(locals.user, 'project reviewer')) {
			return json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const clientId = getClientIdentifier(request, cookies);
		if (!checkRateLimit(`project-review-next:${clientId}`, 60, 60000)) {
			return json({ success: false, error: 'Too many requests' }, { status: 429 });
		}

		const excludeIds = parseExcludeIds(url.searchParams.get('exclude') || '');

		const all = await base('YSWS Project Submission')
			.select({ sort: [{ field: 'Created', direction: 'desc' }], maxRecords: 500 })
			.all();

		const waiting = all.filter(isWaitingForReview);
		const latestPerProject = pickLatestPerProject(waiting);
		const reviewerId = String(locals.user.recId || '');

		let withOne = 0;
		let withTwo = 0;
		for (const r of latestPerProject) {
			const p = getPassCount(r);
			if (p === 1) withOne += 1;
			else if (p === 2) withTwo += 1;
		}
		const projectsLeft = latestPerProject.filter((r) => getPassCount(r) < 2).length;

		/** @type {Set<string>} */
		const reviewedProjectIds = new Set();
		for (const r of all) {
			if (getReviewerIdAt(r, 1) === reviewerId || getReviewerIdAt(r, 2) === reviewerId) {
				const pid = getProjectId(r);
				if (pid) reviewedProjectIds.add(pid);
			}
		}

		const candidates = latestPerProject.filter((r) => {
			const r1 = getReviewerIdAt(r, 1);
			const r2 = getReviewerIdAt(r, 2);
			if (r1 === reviewerId || r2 === reviewerId) return false;
			const taken = (r1 ? 1 : 0) + (r2 ? 1 : 0);
			if (taken >= 2) return false;
			if (excludeIds.has(r.id)) return false;
			return true;
		});
		// Queue order: oldest submission first
		candidates.sort((a, b) => getCreatedMs(a) - getCreatedMs(b));

		const stats = {
			projectsLeft,
			projectsWithOneReviewer: withOne,
			projectsWithTwoReviewers: withTwo,
			projectsYouReviewed: reviewedProjectIds.size
		};

		if (candidates.length === 0) {
			return json({ success: true, project: null, stats });
		}

		const picked = candidates[0];
		const bundle = await buildProjectBundle(picked);
		return json({ success: true, project: bundle, stats });
	} catch (e) {
		console.error('project reviewer GET error:', e);
		return json({ success: false, error: 'Failed to fetch review project' }, { status: 500 });
	}
}

export async function POST({ locals, request, cookies }) {
	try {
		if (!locals.user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		if (!hasPerm(locals.user, 'project reviewer')) {
			return json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const clientId = getClientIdentifier(request, cookies);
		if (!checkRateLimit(`project-review-submit:${clientId}`, 80, 60000)) {
			return json({ success: false, error: 'Too many requests' }, { status: 429 });
		}

		const body = await request.json();
		const submissionId = String(body?.submissionId || '');
		const action = String(body?.action || 'submit');

		if (!submissionId) return json({ success: false, error: 'submissionId required' }, { status: 400 });
		if (action === 'skip') return json({ success: true });

		const estimatedHours = String(body?.estimatedHoursFeel || '').trim();
		const coinsAward = Number(body?.coinsAward || 0);
		const feedback = String(body?.feedback || '').trim();
		const suspicious = !!body?.suspicious;

		if (!Number.isFinite(coinsAward) || coinsAward < 0) {
			return json({ success: false, error: 'coinsAward must be non-negative' }, { status: 400 });
		}
		if (!estimatedHours || !feedback) {
			return json({ success: false, error: 'all text fields are required' }, { status: 400 });
		}

		const rec = await base('YSWS Project Submission').find(submissionId);
		const reviewerId = String(locals.user.recId || '');
		const currentR1 = getReviewerIdAt(rec, 1);
		const currentR2 = getReviewerIdAt(rec, 2);
		if (currentR1 === reviewerId || currentR2 === reviewerId) {
			return json({ success: false, error: 'already reviewed by you' }, { status: 400 });
		}

		const now = new Date();
		now.setSeconds(0, 0);
		const nowIso = now.toISOString();

		/** @type {any} */
		const updateFields = {};

		if (!currentR1) {
			updateFields.projectReviewer1 = [reviewerId];
			updateFields.projectReview1EstimatedHoursFeel = estimatedHours;
			updateFields.projectReview1Coins = coinsAward;
			updateFields.projectReview1Feedback = feedback;
			updateFields.projectReview1Suspicious = suspicious;
			updateFields.projectReview1SubmittedAt = nowIso;
		} else if (!currentR2) {
			updateFields.projectReviewer2 = [reviewerId];
			updateFields.projectReview2EstimatedHoursFeel = estimatedHours;
			updateFields.projectReview2Coins = coinsAward;
			updateFields.projectReview2Feedback = feedback;
			updateFields.projectReview2Suspicious = suspicious;
			updateFields.projectReview2SubmittedAt = nowIso;
		} else {
			return json({ success: false, error: 'project already has 2 reviews' }, { status: 400 });
		}

		await base('YSWS Project Submission').update(submissionId, updateFields);
		return json({ success: true });
	} catch (e) {
		console.error('project reviewer POST error:', e);
		return json({ success: false, error: 'Failed to save project review' }, { status: 500 });
	}
}
