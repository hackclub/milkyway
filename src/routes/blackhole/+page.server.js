import { redirect, error } from '@sveltejs/kit';
import {
  getUserCoinsAndStellarships,
  sanitizeUserForFrontend
} from '$lib/server/auth';
import { getUserProjectsByEmail } from '$lib/server/projects';
import { getUserSubmissions } from '$lib/server/blackhole.js';

export async function load({ locals }) {
  if (!locals.user) throw redirect(302, '/');

  const email = locals.user.email;
  const recId = locals.user.recId;
  if (!email || !recId) throw error(400, 'User profile incomplete');

  const [projects, wallet] = await Promise.all([
    getUserProjectsByEmail(email),
    getUserCoinsAndStellarships(recId)
  ]);

  let submissions = [];
  try {
    submissions = await getUserSubmissions(recId);
  } catch (err) {
    console.error('Error loading blackhole submissions:', err);
    submissions = [];
  }

  return {
    user: sanitizeUserForFrontend(locals.user),
    coins: wallet.coins ?? 0,
    stellarships: wallet.stellarships ?? 0,
    projects,
    submissions
  };
}
