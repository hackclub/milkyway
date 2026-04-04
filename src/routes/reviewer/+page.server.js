// import { redirect } from '@sveltejs/kit';
// import { sanitizeUserForFrontend } from '$lib/server/auth';
// import { getReviewerPermissions } from '$lib/server/reviewer.js';

// export async function load({ locals }) {
//   if (!locals.user) throw redirect(302, '/');

//   const recId = locals.user.recId;
//   const permissions = recId ? await getReviewerPermissions(recId) : []; 
  
//   return {
//     user: sanitizeUserForFrontend(locals.user),
//     permissions
//   };
// }

// the one that worked

// import { redirect } from '@sveltejs/kit';
// import { getReviewerPermissions } from '$lib/server/reviewer.js';

// export async function load({ locals }) {
//   console.log('[reviewer root] load hit. locals.user =', locals.user);

//   if (!locals.user) throw redirect(302, '/');

//   try {
//     const perms = await getReviewerPermissions(locals.user.recId);
//     console.log('[reviewer root] perms =', perms);
//     return { perms };
//   } catch (e) {
//     console.error('[reviewer root] getReviewerPermissions failed:', e);

//     return { perms: [] };
//   }
// }

import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {

  if (!locals.user) throw redirect(302, '/');

  // ✅ Use perms already on locals.user
  const perms = Array.isArray(locals.user.permissions)
    ? locals.user.permissions.map(String)
    : [];

  return {
    perms,
    userRecId: locals.user.recId
  };
}
