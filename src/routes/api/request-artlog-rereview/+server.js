import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { verifyProjectOwnership } from '$lib/server/projects.js';
import { checkRateLimit, getClientIdentifier } from '$lib/server/security.js';

export async function POST({ request, cookies }) {
	try {
		const sessionId = cookies.get('sessionid');
		const userInfo = await getUserInfoBySessionId(sessionId || '');

		if (!userInfo || !userInfo.email || !userInfo.recId) {
			return json(
				{
					success: false,
					error: { message: 'Authentication required' }
				},
				{ status: 401 }
				);
		}

		// Rate limiting: 30 re-review requests per minute per client
		const clientId = getClientIdentifier(request, cookies);
		if (!checkRateLimit(`artlog-rereview:${clientId}`, 30, 60000)) {
			return json(
				{
					success: false,
					error: { message: 'Too many re-review requests. Please slow down.' }
				},
				{ status: 429 }
			);
		}

		const body = await request.json();
		const artlogId = body?.artlogId;
		const messageRaw = body?.message;

		if (!artlogId || typeof artlogId !== 'string') {
			return json(
				{
					success: false,
					error: { message: 'artlogId is required' }
				},
				{ status: 400 }
			);
		}

		if (typeof messageRaw !== 'string' || !messageRaw.trim()) {
			return json(
				{
					success: false,
					error: { message: 'please include a short explanation for your re-review request' }
				},
				{ status: 400 }
			);
		}

		const message = messageRaw.trim();
		if (message.length > 2000) {
			return json(
				{
					success: false,
					error: { message: 're-review request is too long (max 2000 characters)' }
				},
				{ status: 400 }
			);
		}

		// Load the artlog record
		const artlog = await base('Artlog').find(artlogId);
		if (!artlog) {
			return json(
				{
					success: false,
					error: { message: 'Artlog not found' }
				},
				{ status: 404 }
			);
		}

		const f = artlog.fields;

		// Security: ensure the artlog belongs to one of the user's projects
		const projectsField = f.Projects;
		/** @type {string[]} */
		const projectIds = Array.isArray(projectsField)
			? projectsField.map((p) => String(p))
			: projectsField
				? [String(projectsField)]
				: [];

		let ownsAtLeastOneProject = false;
		for (const pid of projectIds) {
			// verifyProjectOwnership handles Airtable lookups correctly
			// and checks that the email matches one of the linked users
			// eslint-disable-next-line no-await-in-loop
			if (await verifyProjectOwnership(pid, String(userInfo.email))) {
				ownsAtLeastOneProject = true;
				break;
			}
		}

		if (!ownsAtLeastOneProject) {
			return json(
				{
					success: false,
					error: { message: 'Forbidden' }
				},
				{ status: 403 }
			);
		}

		// Only allow re-review for rejected or decreased artlogs
		const hours = typeof f.hours === 'number' ? f.hours : Number(f.hours) || 0;
		const approvedHours =
			typeof f.approvedHours === 'number' ? f.approvedHours : null;

		if (
			approvedHours === null ||
			approvedHours > hours ||
			(approvedHours !== 0 && approvedHours >= hours)
		) {
			return json(
				{
					success: false,
					error: {
						message: 're-review is only available for rejected or decreased artlogs'
					}
				},
				{ status: 400 }
			);
		}

		// Build a summary of the previous review to store alongside the new request
		const reviewNote = typeof f.reviewNote === 'string' ? f.reviewNote : '';
		const reviewedAt = f.reviewedAt ? String(f.reviewedAt) : null;
		const previousRequest = typeof f.rereviewRequest === 'string' ? f.rereviewRequest : '';

		let reviewerLabel = '';
		const approvedByField = f.approvedBy;
		if (Array.isArray(approvedByField) && approvedByField.length > 0) {
			const reviewerId = String(approvedByField[0]);
			try {
				// eslint-disable-next-line no-await-in-loop
				const reviewerRec = await base('User').find(reviewerId);
				// @ts-ignore dynamic Airtable fields
				const reviewerName = reviewerRec.fields.username || reviewerRec.fields.email;
				reviewerLabel = reviewerName
					? `${reviewerName} (${reviewerId})`
					: reviewerId;
			} catch {
				reviewerLabel = reviewerId;
			}
		}

		const lines = [];
		lines.push('Previous review:');
		if (reviewerLabel) {
			lines.push(`- reviewer: ${reviewerLabel}`);
		}
		if (reviewedAt) {
			lines.push(`- reviewed at: ${reviewedAt}`);
		}
		lines.push(`- approved hours: ${approvedHours} / ${hours}`);
		if (reviewNote) {
			lines.push(`- notes: ${reviewNote}`);
		}
		lines.push('');
		lines.push('User re-review request:');
		lines.push(message);

		const newBlock = lines.join('\n');
		const newRereviewRequest = previousRequest
			? `${previousRequest}\n\n---\n\n${newBlock}`
			: newBlock;

		// Reset review fields so this artlog is pending again, and store the request
		const updateFields = /** @type {any} */ ({
			approvedHours: null,
			approvedBy: [],
			reviewNote: '',
			reviewedAt: null,
			rereviewRequest: newRereviewRequest
		});

		const updated = await base('Artlog').update(artlogId, updateFields);

		return json({
			success: true,
			artlog: {
				id: updated.id,
				status: 'pending',
				rereviewRequest: newRereviewRequest
			}
		});
	} catch (error) {
		console.error('Error requesting artlog re-review:', error);
		return json(
			{
				success: false,
				error: { message: 'Failed to request re-review' }
			},
			{ status: 500 }
		);
	}
}
