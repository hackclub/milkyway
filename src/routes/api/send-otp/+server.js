// go to airtable
// put in email, generate token, generate otp

import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { createOTPRecord } from '$lib/server/auth.js';

export async function POST({ request }) {

  const { email } = await request.json();
  if (!email) return json({ error: 'Email required' }, { status: 400 });

  try {
    await createOTPRecord(email);
    return json({ success: true }); // success!!

  } catch (err) {

    console.error('Airtable error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to create OTP record';

    // return json with failure
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 500 });

  }

}
