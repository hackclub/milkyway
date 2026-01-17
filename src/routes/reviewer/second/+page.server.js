// import { redirect } from '@sveltejs/kit';
// import { getReviewerPermissions, getSecondReviewQueue } from '$lib/server/reviewer.js';

// export async function load({ locals }) {
//   if (!locals.user) throw redirect(302, '/');

//   const perms = await getReviewerPermissions(locals.user.recId);
//   if (!perms.includes('Second')) throw redirect(302, '/reviewer');

//   const projects = await getSecondReviewQueue();
//   return { projects };
// }

import { redirect } from '@sveltejs/kit';
import { getSecondReviewQueue } from '$lib/server/reviewer.js';

export async function load({ locals }) {
  if (!locals.user) throw redirect(302, '/');

  const perms = Array.isArray(locals.user.permissions) ? locals.user.permissions : [];
  if (!perms.includes('Second')) throw redirect(302, '/reviewer');

  try {
    const projects = await getSecondReviewQueue();
    return { projects };
  } catch (e) {
    console.error('[second] load failed:', e);
    return { projects: [], error: e?.message ?? String(e) };
  }
}
