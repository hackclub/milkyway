import { getUserInfoBySessionId, updateUserLastLogin } from '$lib/server/auth';

export async function handle({ event, resolve }) {
	const sessionid = event.cookies.get('sessionid');

	if (sessionid) {
		const user = await getUserInfoBySessionId(sessionid);
		if (user) {
			// @ts-ignore - getUserInfoBySessionId returns Airtable FieldSet which has dynamic fields
			event.locals.user = user;

			// Update lastLogin timestamp every time user visits the site
			// Don't await - let it run in background to not slow down page load
			updateUserLastLogin(user.recId).catch((err) => {
				console.error('Failed to update lastLogin:', err);
			});
		}
	}

	const response = await resolve(event);

	// Add security headers
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

	// Content Security Policy - allow inline styles for Svelte
	// Note: Adjust as needed for your specific use case
	const csp = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' https://plausible.io", // Svelte needs inline scripts, Plausible analytics
		"style-src 'self' 'unsafe-inline'", // Svelte needs inline styles
		"img-src 'self' data: https:", // Allow data URLs and HTTPS for uploaded images
		"font-src 'self' data: https://db.onlinewebfonts.com", // Allow custom fonts
		"connect-src 'self' https://plausible.io", // Allow Plausible analytics connections
		"media-src 'self' data: https: https://*.airtableusercontent.com", // Allow data URLs and HTTPS (e.g. airtableusercontent)
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'self'"
	].join('; ');

	response.headers.set('Content-Security-Policy', csp);

	return response;
}
