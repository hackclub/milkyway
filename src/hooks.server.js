

import { getUserInfoBySessionId, updateUserLastLogin } from '$lib/server/auth';

export async function handle({ event, resolve }) {
  const sessionid = event.cookies.get('sessionid');

  if (sessionid) {
    const user = await getUserInfoBySessionId(sessionid);
    if (user) {
      // @ts-ignore - getUserInfoBySessionId returns Airtable FieldSet which has dynamic fields
      event.locals.user = user;
      
      // Update lastLogin timestamp every time user visits the site
      // Don't await - let it run in background to not slow down page load
      updateUserLastLogin(user.recId).catch(err => {
        console.error('Failed to update lastLogin:', err);
      });
    }
  }

  return resolve(event); // continue to page or endpoint
}
