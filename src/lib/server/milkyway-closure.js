/**
 * Milkyway project submission window: closed globally except for users with an
 * Airtable `User.extension` date — submission stays open until the end of that
 * calendar day (UTC).
 */

export const MILKYWAY_SUBMISSION_CLOSED_MESSAGE =
	'Milkyway project submissions have ended. The shop and review rewards are still available.';

/**
 * @param {unknown} raw
 * @returns {number | null} UTC ms at end of that calendar day, or null
 */
function parseExtensionDeadlineUtcMs(raw) {
	if (raw == null || raw === '') return null;
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
 * @param {any} user — from getUserInfoBySessionId (expects `extension` from Airtable)
 * @returns {{ submissionOpen: boolean, extensionDeadlineIso: string | null }}
 */
export function getMilkywaySubmissionAccess(user) {
	const deadlineMs = parseExtensionDeadlineUtcMs(user?.extension);
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
