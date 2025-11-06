import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// This ensures we get the real client IP from proxy headers
			// If you're behind Cloudflare, Nginx, or any reverse proxy
		})
	}
};

export default config;
