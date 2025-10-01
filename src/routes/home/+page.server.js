import { redirect } from "@sveltejs/kit";
import { getUserProjectsByEmail } from '$lib/server/projects.js';

export async function load({ locals }) {
  if (!locals.user) {
    throw redirect(302, '/');
  }

  // Load user's projects from Airtable
  console.log('Loading projects for user:', locals.user.recId);
  const projects = await getUserProjectsByEmail(locals.user.email);
  console.log('Loaded projects:', projects);

  return {
    user: locals.user,
    projects
  };
}
