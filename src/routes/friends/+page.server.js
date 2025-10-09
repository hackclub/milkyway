import { redirect } from "@sveltejs/kit";
import { getUserProjectsByEmail } from '$lib/server/projects.js';

export async function load({ locals }) {
  if (!locals.user) {
    throw redirect(302, '/');
  }

  // Only load user's own projects server-side for instant page load
  // Friends data will be fetched client-side for better UX
  const projects = await getUserProjectsByEmail(locals.user.email);

  return {
    user: locals.user,
    projects
  };
}

