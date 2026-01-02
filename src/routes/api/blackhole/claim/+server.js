// Claim stellar ship or dismiss rejection from blackhole

import { json, error } from '@sveltejs/kit';
import { claimStellarShip, dismissBlackholeResult } from '$lib/server/blackhole.js';

export async function POST({ request, locals }) {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	let body;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const { submissionId, action } = body;

	if (!submissionId || typeof submissionId !== 'string') {
		throw error(400, 'Missing submissionId');
	}

	if (action !== 'claim' && action !== 'dismiss') {
		throw error(400, 'Invalid action. Must be "claim" or "dismiss"');
	}

	const username = locals.user.username;
	if (!username) {
		throw error(400, 'User has no username');
	}

	try {
		if (action === 'claim') {
			const result = await claimStellarShip(submissionId, username);
			// Airtable formula will update stellarships; just acknowledge success
			return json(result);
		} else {
			const result = await dismissBlackholeResult(submissionId, username);
			return json(result);
		}
	} catch (err) {
		console.error('Blackhole claim error:', err);
		const msg = err instanceof Error ? err.message : 'Failed to process';
		throw error(400, msg);
	}
}

