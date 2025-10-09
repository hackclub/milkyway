

import { getUserInfoBySessionId } from '$lib/server/auth';

export async function handle({ event, resolve }) {
  const sessionid = event.cookies.get('sessionid');

  if (sessionid) {
    const user = await getUserInfoBySessionId(sessionid);
    if (user) {
      // @ts-ignore - getUserInfoBySessionId returns Airtable FieldSet which has dynamic fields
      event.locals.user = user;
    }
  }

  return resolve(event); // continue to page or endpoint
}
