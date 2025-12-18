import { redirect, error } from '@sveltejs/kit';
import { env as PUBLIC_ENV } from '$env/dynamic/public';
import { getUserCoinsAndStellarships, sanitizeUserForFrontend } from '$lib/server/auth';
import { getUserProjectsByEmail } from '$lib/server/projects';
import { getMyBlackholeSubmissions, getAllApprovedStellarShips } from '$lib/server/blackhole.js';


export async function load({ locals }) {
  if (PUBLIC_ENV.PUBLIC_SHOW_BLACKHOLE !== 'true') {
    throw redirect(302, '/home');
  }

  if (!locals.user) throw redirect(302, '/');

  const email = locals.user.email;
  const recId = locals.user.recId;
  const username = locals.user.username;

  if (!email || !recId || !username) {
    throw error(400, 'User profile incomplete');
  }

  const [projects, wallet, submissions, approvedStellarShips] = await Promise.all([
    getUserProjectsByEmail(email),
    getUserCoinsAndStellarships(recId),
    getMyBlackholeSubmissions(username),
    getAllApprovedStellarShips()
  ]);

  return {
    user: sanitizeUserForFrontend(locals.user),
    coins: wallet.coins ?? 0,
    stellarships: wallet.stellarships ?? 0,
    projects,
    submissions,
    approvedStellarShips
  };
}

