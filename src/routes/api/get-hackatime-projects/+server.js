import { fetchProjects } from '$lib/server/hackatime.js';
import { json } from '@sveltejs/kit';
import { isValidEmail, sanitizeErrorMessage } from '$lib/server/security.js';

export async function POST({ request, locals }) {
	try {
		// Require authentication
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { startDate } = await request.json();

		// SECURITY: Always use the authenticated user's email, never trust client input
		const email = locals.user.email;

		if (!email) {
			return json({ error: 'User email not found' }, { status: 400 });
		}

		const result = await fetchProjects(email, null, startDate);
		return json({ success: true, data: result });
	} catch (error) {
		console.error('Error in get-hackatime-projects API:', error);
		
		// Check if it's a 404 "User not found" error and preserve the original error details
		if (error instanceof Error && error.message && error.message.includes('HTTP error! status: 404') && 
		    error.message.includes('"error":"User not found"')) {
			return json({ 
				success: false, 
				error: 'User not found', 
				userNotFound: true 
			}, { status: 404 });
		}
		
		return json({ 
			error: 'Failed to fetch HackaTime projects', 
			details: sanitizeErrorMessage(error, 'Unknown error') 
		}, { status: 500 });
	}
}


