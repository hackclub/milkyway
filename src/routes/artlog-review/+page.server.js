import { redirect, error } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { escapeAirtableFormula } from '$lib/server/security.js';
import { sanitizeUserForFrontend } from '$lib/server/auth.js';

/**
 * @param {any} user
 */
function userHasArtlogReviewerPermission(user) {
	const perms = user?.permissions;

	if (Array.isArray(perms)) {
		return perms.includes('artlog reviewer');
	}

	if (typeof perms === 'string') {
		return perms.split(',').map((p) => p.trim()).includes('artlog reviewer');
	}

	return false;
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	if (!userHasArtlogReviewerPermission(locals.user)) {
		throw error(403, 'Not authorized to review artlogs');
	}

	try {
		// Fetch stats across all artlogs and the pending-only queue from the "Pending reviews" view
		const [allArtlogRecords, pendingArtlogRecords] = await Promise.all([
			// Minimal fields needed to compute stats
			base('Artlog')
				.select({
					fields: ['approvedHours', 'approvedBy']
				})
				.all(),
			// Source of truth for which artlogs are pending review
			base('Artlog')
				.select({
					view: 'Pending reviews'
				})
				.all()
		]);

		// Stats: how many artlogs exist, how many are reviewed, etc.
		const totalArtlogs = allArtlogRecords.length;
		let reviewedCount = 0;
		let reviewedByCurrentUser = 0;

		for (const record of allArtlogRecords) {
			const f = record.fields;
			const hasApprovedHours = typeof f.approvedHours === 'number';
			const approvedByField = f.approvedBy;
			const hasApprovedByArray =
				Array.isArray(approvedByField) && approvedByField.length > 0;

			if (hasApprovedHours || hasApprovedByArray) {
				reviewedCount += 1;

				// Count how many artlogs this reviewer has personally reviewed
				if (locals.user.recId && hasApprovedByArray) {
					const reviewerId = String(locals.user.recId);
					const approvedByIds = approvedByField.map((v) => String(v));
					if (approvedByIds.includes(reviewerId)) {
						reviewedByCurrentUser += 1;
					}
				}
			}
		}

		// Remaining artlogs = those that are still pending (should match the pending view)
		const remainingCount = totalArtlogs - reviewedCount;

		// Shuffle pending records (from view) and take a small queue (e.g. 20)
		// Spread into a plain mutable array to satisfy shuffleArray's typing
		const queueRecords = shuffleArray(Array.from(pendingArtlogRecords)).slice(0, 20);

		// Collect related project and user IDs
		/** @type {Set<string>} */
		const projectIds = new Set();

		for (const record of queueRecords) {
			const projectsField = record.fields.Projects;
			if (Array.isArray(projectsField)) {
				for (const pid of projectsField) {
					if (pid) projectIds.add(String(pid));
				}
			} else if (projectsField) {
				projectIds.add(String(projectsField));
			}
		}

		let projectMap = new Map();
		let userMap = new Map();

		if (projectIds.size > 0) {
			const projectIdArray = Array.from(projectIds);
			const projectFilter = projectIdArray
				.map(
					/** @param {string} id */ (id) =>
						`RECORD_ID() = "${escapeAirtableFormula(id)}"`
				)
				.join(', ');

			const projectRecords = await base('Projects')
				.select({
					filterByFormula: `OR(${projectFilter})`
				})
				.all();

			projectMap = new Map(projectRecords.map((r) => [r.id, r]));

			/** @type {Set<string>} */
			const userIds = new Set();
			for (const proj of projectRecords) {
				const userField = proj.fields.user;
				if (Array.isArray(userField)) {
					for (const uid of userField) {
						if (uid) userIds.add(String(uid));
					}
				} else if (userField) {
					userIds.add(String(userField));
				}
			}

			if (userIds.size > 0) {
				const userIdArray = Array.from(userIds);
				const userFilter = userIdArray
					.map(
						/** @param {string} id */ (id) =>
							`RECORD_ID() = "${escapeAirtableFormula(id)}"`
					)
					.join(', ');

				const userRecords = await base('User')
					.select({
						filterByFormula: `OR(${userFilter})`
					})
					.all();

				userMap = new Map(userRecords.map((r) => [r.id, r]));
			}
		}

		const queue = queueRecords.map((record) => {
			const f = record.fields;

			// Image from attachments
			let imageUrl = '';
			const imageField = f.image;
			if (imageField && Array.isArray(imageField) && imageField.length > 0) {
				// @ts-ignore - Airtable attachment typing
				imageUrl = String(imageField[0]?.url || '');
			}

			// Linked project (first one)
			let projectInfo = null;
			let username = '';

			const projectsField = f.Projects;
			let primaryProjectId = null;

			if (Array.isArray(projectsField) && projectsField.length > 0) {
				primaryProjectId = String(projectsField[0]);
			} else if (projectsField) {
				primaryProjectId = String(projectsField);
			}

			if (primaryProjectId && projectMap.has(primaryProjectId)) {
				const projRecord = projectMap.get(primaryProjectId);
				const pf = projRecord.fields;

				let primaryUserId = null;
				const userField = pf.user;
				if (Array.isArray(userField) && userField.length > 0) {
					primaryUserId = String(userField[0]);
				} else if (userField) {
					primaryUserId = String(userField);
				}

				let userRecord = null;
				if (primaryUserId && userMap.has(primaryUserId)) {
					userRecord = userMap.get(primaryUserId);
				}

				if (userRecord) {
					// @ts-ignore - Airtable dynamic fields
					username = String(userRecord.fields.username || '');
				}

				const hackatimeHours =
					typeof pf.hackatimeHours === 'number' ? pf.hackatimeHours : 0;
				const artHours =
					typeof pf.artHours === 'number' ? pf.artHours : 0;

				projectInfo = {
					id: projRecord.id,
					name: String(pf.projectname || 'Untitled Project'),
					description: String(pf.description || ''),
					shipURL: String(pf.shipURL || ''),
					githubURL: String(pf.githubURL || ''),
					totalHours: Math.round((hackatimeHours + artHours) * 100) / 100
				};
			}

			const hours =
				typeof f.hours === 'number' ? f.hours : Number(f.hours) || 0;

			return {
				id: record.id,
				hours,
				description: String(f.description || ''),
				proof: String(f.proof || ''),
				image: imageUrl,
				created: String(f.Created || record._rawJson?.createdTime || ''),
				project: projectInfo,
				username,
				// surface re-review request (if any) for reviewers
				rereviewRequest: String(f.rereviewRequest || '')
			};
		});

		return {
			user: sanitizeUserForFrontend(locals.user),
			stats: {
				totalArtlogs,
				reviewedCount,
				remainingCount,
				reviewedByCurrentUser
			},
			artlogs: queue
		};
	} catch (err) {
		console.error('Error loading artlog reviewer page:', err);
		throw error(500, 'Failed to load artlog reviews');
	}
}

/**
 * Fisher-Yates shuffle
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
function shuffleArray(array) {
	const result = array.slice();
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

