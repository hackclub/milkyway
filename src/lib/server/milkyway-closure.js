/**
 * Milkyway project submission window: closed globally except for users with an
 * Airtable `User.extension` date — submission stays open until the end of that
 * calendar day (UTC).
 */

export const MILKYWAY_SUBMISSION_CLOSED_MESSAGE =
	'Milkyway project submissions have ended. The shop and review rewards are still available.';

/**
 * Read the Milkyway extension date from Airtable `User` fields or a normalized user object.
 * Airtable field names are case-sensitive; the column may be `extension` or `Extension`.
 * @param {any} userOrFields
 * @returns {unknown}
 */
export function getMilkywayExtensionRaw(userOrFields) {
	if (userOrFields == null || typeof userOrFields !== 'object') return null;
	const direct = userOrFields.extension;
	if (direct != null && direct !== '') return direct;
	for (const key of Object.keys(userOrFields)) {
		if (key.toLowerCase() === 'extension') {
			const v = userOrFields[key];
			if (v != null && v !== '') return v;
		}
	}
	return null;
}

/**
 * @param {unknown} raw
 * @returns {number | null} UTC ms at end of that calendar day, or null
 */
function parseExtensionDeadlineUtcMs(raw) {
	if (raw == null || raw === '') return null;
	if (typeof raw === 'number' && Number.isFinite(raw)) {
		const dt = new Date(raw);
		if (Number.isNaN(dt.getTime())) return null;
		return Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 23, 59, 59, 999);
	}
	if (Array.isArray(raw)) {
		for (const item of raw) {
			const ms = parseExtensionDeadlineUtcMs(item);
			if (ms != null) return ms;
		}
		return null;
	}
	const s = String(raw).trim();
	if (!s) return null;

	const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (ymd) {
		const y = parseInt(ymd[1], 10);
		const m = parseInt(ymd[2], 10) - 1;
		const d = parseInt(ymd[3], 10);
		if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
		return Date.UTC(y, m, d, 23, 59, 59, 999);
	}

	const t = Date.parse(s);
	if (Number.isNaN(t)) return null;
	const dt = new Date(t);
	return Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 23, 59, 59, 999);
}

/**
 * @param {any} userOrFields — normalized user from auth, or raw Airtable User `fields`
 * @returns {{ submissionOpen: boolean, extensionDeadlineIso: string | null }}
 */
export function getMilkywaySubmissionAccess(userOrFields) {
	const deadlineMs = parseExtensionDeadlineUtcMs(getMilkywayExtensionRaw(userOrFields));
	if (deadlineMs == null) {
		return { submissionOpen: false, extensionDeadlineIso: null };
	}
	const extensionDeadlineIso = new Date(deadlineMs).toISOString();
	if (Date.now() <= deadlineMs) {
		return { submissionOpen: true, extensionDeadlineIso };
	}
	return { submissionOpen: false, extensionDeadlineIso };
}

/**
 * @param {any} user
 * @returns {boolean}
 */
export function isMilkywaySubmissionOpen(user) {
	return getMilkywaySubmissionAccess(user).submissionOpen;
}

/** Thrown by server-side project mutations when submissions are closed (defense in depth). */
export class MilkywaySubmissionClosedError extends Error {
	constructor(message = MILKYWAY_SUBMISSION_CLOSED_MESSAGE) {
		super(message);
		this.name = 'MilkywaySubmissionClosedError';
	}
}
