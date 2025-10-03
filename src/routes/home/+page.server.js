import { redirect } from "@sveltejs/kit";
import { getUserProjectsByEmail } from '$lib/server/projects.js';
import { getUserCoinsAndStellarships } from '$lib/server/auth.js';

export async function load({ locals }) {
  if (!locals.user) {
    throw redirect(302, '/');
  }

  // Load user's projects from Airtable
  console.log('Loading projects for user:', locals.user.recId);
  const projects = await getUserProjectsByEmail(locals.user.email);
  console.log('Loaded projects:', projects);

  // Load user's coins and stellarships from Airtable
  console.log('Loading coins and stellarships for user:', locals.user.recId);
  const { coins, stellarships } = await getUserCoinsAndStellarships(locals.user.recId);
  console.log('Loaded coins:', coins, 'stellarships:', stellarships);

  return {
    user: locals.user,
    projects,
    coins,
    stellarships
  };
}
