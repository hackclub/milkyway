import  { json, error } from '@sveltejs/kit';
import { blackholeModerateSchema, rejectBlackholeSubmission } from '$lib/server/blackhole.js'

export async function POST({ request }) {
    let body;
    try {
        body = await request.json();
    } catch {
        throw error(400, 'Invalid JSON');
    }

    let input;
    try {
        input = blackholeModerateSchema.parse(body);
    } catch (err) {
        console.error('', err);
        throw error(400, 'Invalid input');
    }

    try {
        const updated = await rejectBlackholeSubmission(input);
        return json(updated);
    } catch (err) {
        console.error('Blackhole reject error:', err);
        const msg = err instanceof Error ? err.message : 'Failed to reject submission... uh oh';
        throw error(400, msg);
    }
}
