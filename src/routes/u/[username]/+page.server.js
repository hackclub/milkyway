export async function load({ params, locals }) {
  // Just pass the username and auth state - let client-side fetch the actual data
  return {
    username: params.username,
    isLoggedIn: !!locals.user,
    currentUser: locals.user ? {
      recId: locals.user.recId,
      username: locals.user.username
    } : null,
    user: {
      id: '',
      username: params.username,
      coins: 0,
      stellarships: 0,
      paintchips: 0,
      followerCount: 0,
      followingCount: 0
    }
  };
}

