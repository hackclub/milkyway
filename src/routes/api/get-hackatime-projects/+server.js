import { fetchProjects } from '$lib/server/hackatime.js';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
	try {
		const { email, startDate } = await request.json();

		console.log('HackaTime API request:', { email, startDate });

		if (!email) {
			return json({ error: 'Email is required' }, { status: 400 });
		}

		const result = await fetchProjects(email, null, startDate);
		console.log('HackaTime API result:', { success: true, dataKeys: result ? Object.keys(result) : 'no result' });
		return json({ success: true, data: result });
	} catch (error) {
		console.error('Error in get-hackatime-projects API:', error);
		return json({ error: 'Failed to fetch HackaTime projects', details: error.message }, { status: 500 });
	}
}


