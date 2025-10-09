import { redirect } from "@sveltejs/kit";
import { getUserProjectsByEmail } from '$lib/server/projects.js';
import { getUserCoinsAndStellarships } from '$lib/server/auth.js';

export async function load({ locals }) {
  if (!locals.user) {
    throw redirect(302, '/');
  }

  // Load user's projects from Airtable
  const projects = await getUserProjectsByEmail(locals.user.email);

  // Load user's coins and stellarships from Airtable
  const { coins, stellarships } = await getUserCoinsAndStellarships(locals.user.recId);

  // Check if user has completed onboarding
  const hasOnboarded = locals.user.hasOnboarded || false;

  return {
    user: locals.user,
    projects,
    coins,
    stellarships,
    hasOnboarded
  };
}
