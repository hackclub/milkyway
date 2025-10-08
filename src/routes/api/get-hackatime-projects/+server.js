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
		
		// Check if it's a 404 "User not found" error and preserve the original error details
		if (error instanceof Error && error.message && error.message.includes('HTTP error! status: 404') && 
		    error.message.includes('"error":"User not found"')) {
			return json({ 
				success: false, 
				error: 'User not found', 
				details: error.message,
				userNotFound: true 
			}, { status: 404 });
		}
		
		return json({ error: 'Failed to fetch HackaTime projects', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
	}
}


