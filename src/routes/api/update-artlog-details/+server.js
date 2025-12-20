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

		// Rate limiting: 60 edits per minute per client
		const clientId = getClientIdentifier(request, cookies);
		if (!checkRateLimit(`artlog-edit:${clientId}`, 60, 60000)) {
			return json(
				{
					success: false,
					error: { message: 'Too many edit requests. Please slow down.' }
				},
				{ status: 429 }
			);
		}

		const body = await request.json();
		const artlogId = body?.artlogId;
		const descriptionRaw = body?.description;
		const proofRaw = body?.proof;

		if (!artlogId || typeof artlogId !== 'string') {
			return json(
				{
					success: false,
					error: { message: 'artlogId is required' }
				},
				{ status: 400 }
			);
		}

		if (typeof descriptionRaw !== 'string' || !descriptionRaw.trim()) {
			return json(
				{
					success: false,
					error: { message: 'description is required' }
				},
				{ status: 400 }
			);
		}

		const description = descriptionRaw.trim();
		if (description.length > 2000) {
			return json(
				{
					success: false,
					error: { message: 'description is too long (max 2000 characters)' }
				},
				{ status: 400 }
			);
		}

		if (typeof proofRaw !== 'string' || !proofRaw.trim()) {
			return json(
				{
					success: false,
					error: { message: 'proof URL is required' }
				},
				{ status: 400 }
			);
		}

		const proof = proofRaw.trim();
		try {
			const url = new URL(proof);
			if (!['http:', 'https:'].includes(url.protocol)) {
				throw new Error('Invalid protocol');
			}
		} catch {
			return json(
				{
					success: false,
					error: { message: 'proof must be a valid HTTP or HTTPS URL' }
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

		// Only allow edits while artlog is pending (no approved hours and no reviewer set)
		const hasApprovedHours = typeof f.approvedHours === 'number';
		const approvedByField = f.approvedBy;
		const hasApprovedBy = Array.isArray(approvedByField) && approvedByField.length > 0;

		if (hasApprovedHours || hasApprovedBy) {
			return json(
				{
					success: false,
					error: { message: 'you can only edit artlogs that are still pending review' }
				},
				{ status: 400 }
			);
		}

		const updated = await base('Artlog').update(artlogId, {
			description,
			proof
		});

		return json({
			success: true,
			artlog: {
				id: updated.id,
				description: updated.fields.description || '',
				proof: updated.fields.proof || ''
			}
		});
	} catch (error) {
		console.error('Error updating artlog details:', error);
		return json(
			{
				success: false,
				error: { message: 'Failed to update artlog' }
			},
			{ status: 500 }
		);
	}
}
