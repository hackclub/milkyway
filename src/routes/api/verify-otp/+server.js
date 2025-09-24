// check the email & otp & expiry time in airtable
// if correct, fetch token and put it in httponly

import { json } from '@sveltejs/kit';

import { verifyOTPAndCreateSession } from '$lib/server/auth.js';


export async function POST({ request, cookies }) {

  const { email, otp } = await request.json();
  if (!email) return json({ error: 'Email required' }, { status: 400 });
  if (!otp) return json({ error: 'OTP required' }, { status: 400 });


  try {

    const sessionid = await verifyOTPAndCreateSession(email, otp)

    cookies.set('sessionid', sessionid, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 1 week
    });

    return json({ success: true });

  } catch (err) {

    return json(
      {
        success: false,
        error: { message: err instanceof Error ? err.message : 'Something went wrong D:' }
      },
      { status: 500 });

  }

}
