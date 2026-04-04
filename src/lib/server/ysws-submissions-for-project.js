import { base } from '$lib/server/db.js';
import { escapeAirtableFormula } from '$lib/server/security.js';

function getCreatedIso(record) {
	// Match reviewer APIs: prefer API createdTime so ordering matches computeReviewContext.
	return String(record._rawJson?.createdTime || record.fields.Created || '');
}

/**
 * `hoursLogged` on the YSWS Project Submission table — snapshot of project code+art hours at ship
 * (set in create-submission from Projects.hackatimeHours + Projects.artHours).
 * @param {any} record
 */
export function getYswsSubmissionHoursLogged(record) {
	return Number(record?.fields?.hoursLogged ?? 0);
}

/**
 * Submission record IDs linked from the Projects table (inverse of projectEgg).
 * @param {Record<string, unknown>} projectFields
 * @returns {string[]}
 */
export function getYswsSubmissionIdsFromProject(projectFields) {
	const raw = projectFields['YSWS Project Submission'];
	if (typeof raw === 'string' && raw.trim().startsWith('rec')) {
		const id = raw.trim();
		return /^rec[a-zA-Z0-9]+$/.test(id) && id.length >= 14 ? [id] : [];
	}
	if (!Array.isArray(raw) || raw.length === 0) return [];
	return raw
		.map((x) => String(x).trim())
		.filter((id) => /^rec[a-zA-Z0-9]+$/.test(id) && id.length >= 14);
}

/**
 * All YSWS submissions for a project: merge (1) reverse link on Projects and (2) projectEgg formula.
 * @param {string} projectId Projects record id
 * @param {Record<string, unknown>} projectFields Projects.fields from a find()
 * @param {{ maxRecords?: number }} [opts]
 */
export async function fetchYswsSubmissionsForProject(projectId, projectFields, opts = {}) {
	const maxRecords = opts.maxRecords ?? 120;

	/** @type {Map<string, any>} */
	const byId = new Map();

	const linkedIds = getYswsSubmissionIdsFromProject(projectFields);
	for (let i = 0; i < linkedIds.length; i += 8) {
		const batch = linkedIds.slice(i, i + 8);
		const orPart = batch
			.map((id) => `RECORD_ID()="${escapeAirtableFormula(id)}"`)
			.join(', ');
		try {
			const batchRecords = await base('YSWS Project Submission')
				.select({ filterByFormula: `OR(${orPart})` })
				.all();
			for (const r of batchRecords) {
				byId.set(r.id, r);
			}
		} catch (e) {
			console.error('[ysws-submissions] linked batch failed:', e);
		}
	}

	try {
		const escaped = escapeAirtableFormula(projectId);
		const formulaRecords = await base('YSWS Project Submission')
			.select({
				filterByFormula: `FIND("${escaped}", ARRAYJOIN({projectEgg}, ",")) > 0`,
				maxRecords
			})
			.all();
		for (const r of formulaRecords) {
			byId.set(r.id, r);
		}
	} catch (e) {
		console.error('[ysws-submissions] projectEgg filter failed:', e);
	}

	const list = Array.from(byId.values());
	list.sort((a, b) => new Date(getCreatedIso(b)).getTime() - new Date(getCreatedIso(a)).getTime());
	return list;
}
