import { redirect } from '@sveltejs/kit';
import { sanitizeUserForFrontend } from '$lib/server/auth';
import { getPendingBlackholeSubmissions } from '$lib/server/blackhole.js';
import { env } from '$env/dynamic/private';

const REVIEWER_PASSWORD = env.REVIEWER_PASSWORD;

export async function load({ locals, cookies }) {
  // still require login; remove this if you want password-only access
  if (!locals.user) throw redirect(302, '/');

  const authorized = cookies.get('reviewer_auth') === '1';

  let submissions = [];
  if (authorized) {
    submissions = await getPendingBlackholeSubmissions();
  }

  return {
    user: sanitizeUserForFrontend(locals.user),
    authorized,
    submissions
  };
}

export const actions = {
    default: async ({ request, cookies }) => {
        const data = await request.formData();
        const password = data.get('password');

        if (typeof password === 'string' && REVIEWER_PASSWORD && password === REVIEWER_PASSWORD) {
            cookies.set('reviewer_auth', '1', {
                path: '/',
                httpOnly: true,
                sameSite: 'strict',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24
            });

            return { success: true };
        }

        cookies.delete('reviewer_auth', { path: '/' });

        return {
            success: false,
            error: 'Invalid password.... Are you supposed to be here???'
        };
    }
};