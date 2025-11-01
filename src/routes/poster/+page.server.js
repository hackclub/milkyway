export async function load({ locals }) {
	const user = locals.user;
	
	return {
		user: user ? {
			email: user.email,
			username: user.username || user.email?.split('@')[0] || 'anonymous'
		} : null
	};
}

