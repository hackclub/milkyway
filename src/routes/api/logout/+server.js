import { json } from '@sveltejs/kit';

export async function POST({ cookies }) {
  // Delete the sessionid cookie by setting it to expire
  cookies.delete('sessionid', { path: '/' });
  
  return json({ success: true });
}
