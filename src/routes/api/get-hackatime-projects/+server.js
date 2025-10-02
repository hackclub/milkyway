import { fetchProjects } from '$lib/server/hackatime.js';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
	try {
		const { email, date } = await request.json();

		if (!email) {
			return json({ error: 'Email is required' }, { status: 400 });
		}

		const result = await fetchProjects(email, date);
		return json({ success: true, data: result });
	} catch (error) {
		console.error('Error in get-hackatime-projects API:', error);
		return json({ error: 'Failed to fetch HackaTime projects' }, { status: 500 });
	}
}


