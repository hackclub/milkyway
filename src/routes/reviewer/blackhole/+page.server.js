// import { redirect } from '@sveltejs/kit';
// import { getReviewerPermissions, getBlackholePendingQueue } from '$lib/server/reviewer.js';

// export async function load({ locals }) {
//   if (!locals.user) throw redirect(302, '/');

//   const perms = await getReviewerPermissions(locals.user.recId);
//   if (!perms.includes('Blackhole')) throw redirect(302, '/reviewer');

//   const submissions =await getBlackholePendingQueue();
//   return { submissions };
// }

import { redirect } from '@sveltejs/kit';
import { getReviewerPermissions, getBlackholePendingQueue } from '$lib/server/reviewer.js';

export async function load({ locals }) {
  if (!locals.user) throw redirect(302, '/');

  const perms = Array.isArray(locals.user.permissions) ? locals.user.permissions : [];
  if (!perms.includes('Blackhole')) throw redirect(302, '/reviewer');

  try {
    const submissions = await getBlackholePendingQueue();
    return { submissions };
  } catch (e) {
    console.error('[blackhole] load failed:', e);
    return { submissions: [], error: e?.message ?? String(e) };
  }
}

