import { json, error } from '@sveltejs/kit';
import { getPendingBlackholeSubmissions } from '$lib/server/blackhole';

export async function GET() {
    try {
        const pending = await getPendingBlackholeSubmissions();
        return json(pending);
    } catch (err) {
        console.error('Blackhole review error:', err);
        throw error(500, 'Failed to fetch pending submissions')
    }
}