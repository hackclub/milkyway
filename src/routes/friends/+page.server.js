import { redirect } from "@sveltejs/kit";
import { getUserProjectsByEmail } from '$lib/server/projects.js';
import { getUserFurnitureByEmail } from '$lib/server/furniture.js';
import { sanitizeUserForFrontend } from '$lib/server/auth.js';

export async function load({ locals }) {
  if (!locals.user) {
    throw redirect(302, '/');
  }

  // Only load user's own projects server-side for instant page load
  // Friends data will be fetched client-side for better UX
  const projects = await getUserProjectsByEmail(locals.user.email);
  const furniture = await getUserFurnitureByEmail(locals.user.email);

  return {
    user: sanitizeUserForFrontend(locals.user), // Sanitize user data before sending to frontend
    projects,
    furniture
  };
}

