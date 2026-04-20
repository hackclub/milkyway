export async function load({ params, locals, url }) {
	try {
		return {
			isLoggedIn: !!locals.user
		};
	} catch (error) {
		console.error('Error loading christmas tree:', error);
		return {
			isLoggedIn: !!locals.user
		};
	}
}
