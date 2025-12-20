import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { checkRateLimit, getClientIdentifier } from '$lib/server/security.js';

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

// POST - review an artlog (approve / reject / decrease)
export async function POST({ request, locals, cookies }) {
	try {
		if (!locals.user) {
			return json(
				{
					success: false,
					error: { message: 'Unauthorized' }
				},
				{ status: 401 }
			);
		}

		if (!userHasArtlogReviewerPermission(locals.user)) {
			return json(
				{
					success: false,
					error: { message: 'Forbidden' }
				},
				{ status: 403 }
			);
		}

		// Rate limit reviews per user / client
		const clientId = getClientIdentifier(request, cookies);
		if (!checkRateLimit(`artlog-review:${clientId}`, 120, 60000)) {
			return json(
				{
					success: false,
					error: { message: 'Too many review actions. Please slow down.' }
				},
				{ status: 429 }
			);
		}

		const body = await request.json();
		const artlogId = body?.artlogId;
		const approvedHoursRaw = body?.approvedHours;
		const reviewNoteRaw = body?.reviewNote;

		if (!artlogId || typeof artlogId !== 'string') {
			return json(
				{
					success: false,
					error: { message: 'artlogId is required' }
				},
				{ status: 400 }
			);
		}

		const approvedHours = Number(approvedHoursRaw);
		if (!Number.isFinite(approvedHours) || approvedHours < 0) {
			return json(
				{
					success: false,
					error: { message: 'approvedHours must be a non-negative number' }
				},
				{ status: 400 }
			);
		}

		// Load the artlog to validate against original hours
		const record = await base('Artlog').find(artlogId);
		if (!record) {
			return json(
				{
					success: false,
					error: { message: 'Artlog not found' }
				},
				{ status: 404 }
			);
		}

		const fields = record.fields;
		const originalHours =
			typeof fields.hours === 'number' ? fields.hours : Number(fields.hours) || 0;

		if (approvedHours > originalHours + 0.001) {
			return json(
				{
					success: false,
					error: {
						message: 'approved hours cannot be greater than the logged hours'
					}
				},
				{ status: 400 }
			);
		}

		const isReject = approvedHours === 0;
		const isDecrease = approvedHours < originalHours;
		const noteRequired = isReject || isDecrease;

		const reviewNote = typeof reviewNoteRaw === 'string' ? reviewNoteRaw.trim() : '';

		if (noteRequired && reviewNote.length === 0) {
			return json(
				{
					success: false,
					error: {
						message: 'Review note is required when rejecting or decreasing hours'
					}
				},
				{ status: 400 }
			);
		}

		// Build Airtable-friendly timestamp:
		// truncate to minutes, zero out seconds and milliseconds,
		// and format as ISO 8601 (e.g. 2019-12-30T21:42:00.000Z)
		const now = new Date();
		now.setSeconds(0, 0);
		const reviewedAtIso = now.toISOString();

		const updateFields = /** @type {any} */ ({
			approvedHours,
			reviewNote,
			reviewedAt: reviewedAtIso
		});

		// Link to the reviewer in approvedBy (linked to User table)
		if (locals.user.recId) {
			updateFields.approvedBy = [locals.user.recId];
		}

		const updated = await base('Artlog').update(artlogId, updateFields);
		const uf = updated.fields;

		return json({
			success: true,
			artlog: {
				id: updated.id,
				approvedHours: typeof uf.approvedHours === 'number' ? uf.approvedHours : null,
				reviewNote: uf.reviewNote || ''
			}
		});
	} catch (error) {
		console.error('Error reviewing artlog:', error);
		return json(
			{
				success: false,
				error: { message: 'Failed to review artlog' }
			},
			{ status: 500 }
		);
	}
}

