// go to airtable
// put in email, generate token, generate otp

import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { createOTPRecord } from '$lib/server/auth.js';
import { isValidEmail, checkRateLimit, getClientIdentifier, getRealClientIP, sanitizeErrorMessage } from '$lib/server/security.js';

export async function POST({ request, cookies }) {

  const { email, referrer } = await request.json();
  
  // Input validation
  if (!email) return json({ error: 'Email required' }, { status: 400 });
  
  if (!isValidEmail(email)) {
    return json({ error: 'Invalid email format' }, { status: 400 });
  }

  // Rate limiting: 5 OTP requests per minute per client
  const clientId = getClientIdentifier(request, cookies);
  if (!checkRateLimit(`send-otp:${clientId}`, 5, 60000)) {
    return json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    // Get real client IP address (handles proxy headers)
    const ipAddress = getRealClientIP(request);
    console.log('Captured REAL client IP address:', ipAddress);
    await createOTPRecord(email, referrer, ipAddress);
    return json({ success: true }); // success!!

  } catch (err) {

    console.error('Airtable error:', err);
    const errorMessage = sanitizeErrorMessage(err instanceof Error ? err : new Error(String(err)), 'Failed to create OTP record');

    // return json with failure
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 500 });

  }

}
