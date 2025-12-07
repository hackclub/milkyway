import { json, error } from '@sveltejs/kit';
import { blackholeSubmitSchema, submitToBlackhole } from '$lib/server/blackhole.js';
// what can i say expect dis for submitting the blackhole 

export async function POST({ request }) {
	let body;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	let input;
	try {
		input = blackholeSubmitSchema.parse(body);
	} catch (err) {
    console.error('Zod error in /approve', err);
    throw error(400, 'Invalid input');
  }

	try {
		const submission = await submitToBlackhole(input);
		return json(submission);
	} catch (err) {
		console.error('Blackhole submit error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to submit to black hole'
    throw error(400, msg);
	}
}

