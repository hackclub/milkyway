// check the email & otp & expiry time in airtable
// if correct, fetch token and put it in httponly

import { json } from '@sveltejs/kit';

import { verifyOTPAndCreateSession } from '$lib/server/auth.js';
import { isValidEmail, isValidOTP, checkRateLimit, getClientIdentifier, sanitizeErrorMessage } from '$lib/server/security.js';


export async function POST({ request, cookies }) {

  const { email, otp } = await request.json();
  
  // Input validation
  if (!email) return json({ error: 'Email required' }, { status: 400 });
  if (!otp) return json({ error: 'OTP required' }, { status: 400 });
  
  if (!isValidEmail(email)) {
    return json({ error: 'Invalid email format' }, { status: 400 });
  }
  
  if (!isValidOTP(otp)) {
    return json({ error: 'Invalid OTP format' }, { status: 400 });
  }

  // Rate limiting: 10 OTP verification attempts per minute per client
  const clientId = getClientIdentifier(request, cookies);
  if (!checkRateLimit(`verify-otp:${clientId}`, 10, 60000)) {
    return json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  try {

    const sessionid = await verifyOTPAndCreateSession(email, otp)

    cookies.set('sessionid', sessionid, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    return json({ success: true });

  } catch (err) {

    return json(
      {
        success: false,
        error: { message: sanitizeErrorMessage(err instanceof Error ? err : new Error(String(err)), 'Verification failed') }
      },
      { status: 500 });

  }

}
