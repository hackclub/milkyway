import { redirect } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';

const HACKCLUB_TOKEN_URL = 'https://auth.hackclub.com/oauth/token';
const HACKCLUB_USERINFO_URL = 'https://auth.hackclub.com/oauth/userinfo';
const HACKCLUB_CLIENT_ID = process.env.HACKCLUB_CLIENT_ID;
const HACKCLUB_CLIENT_SECRET = process.env.HACKCLUB_CLIENT_SECRET;

/**
 * Handles the OAuth callback from Hack Club Auth
 * GET /api/hackclub-auth/callback
 */
export async function GET({ url, cookies }) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  // Check for OAuth errors
  if (error) {
    console.error('Hack Club Auth error:', error, errorDescription);
    throw redirect(302, '/home?hackclub_auth_error=' + encodeURIComponent(errorDescription || error));
  }

  // Verify code exists
  if (!code) {
    throw redirect(302, '/home?hackclub_auth_error=' + encodeURIComponent('No authorization code received'));
  }

  // Verify state to prevent CSRF
  const storedState = cookies.get('hackclub_auth_state');
  if (!storedState || storedState !== state) {
    console.error('State mismatch:', { stored: storedState, received: state });
    throw redirect(302, '/home?hackclub_auth_error=' + encodeURIComponent('Invalid state parameter'));
  }

  // Clear the state cookie
  cookies.delete('hackclub_auth_state', { path: '/' });

  // Verify user is logged in
  const sessionId = cookies.get('sessionid');
  if (!sessionId) {
    throw redirect(302, '/?hackclub_auth_error=' + encodeURIComponent('Session expired'));
  }

  // Get current user
  const user = await getUserInfoBySessionId(sessionId);
  if (!user) {
    throw redirect(302, '/?hackclub_auth_error=' + encodeURIComponent('User not found'));
  }

  try {
    // Exchange code for tokens
    const baseUrl = url.origin;
    const redirectUri = `${baseUrl}/api/hackclub-auth/callback`;

    const tokenBody = new URLSearchParams({
      client_id: HACKCLUB_CLIENT_ID,
      client_secret: HACKCLUB_CLIENT_SECRET,
      redirect_uri: redirectUri,
      code: code,
      grant_type: 'authorization_code'
    });

    const tokenResponse = await fetch(HACKCLUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenBody.toString()
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorText);
      throw redirect(302, '/home?hackclub_auth_error=' + encodeURIComponent('Failed to exchange authorization code'));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('No access token in response:', tokenData);
      throw redirect(302, '/home?hackclub_auth_error=' + encodeURIComponent('No access token received'));
    }

    // Fetch user info from Hack Club
    const userInfoResponse = await fetch(HACKCLUB_USERINFO_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error('Userinfo fetch failed:', userInfoResponse.status, errorText);
      throw redirect(302, '/home?hackclub_auth_error=' + encodeURIComponent('Failed to fetch user information'));
    }

    const userInfo = await userInfoResponse.json();
    
    // SECURITY: Only log non-sensitive data for debugging
    console.log('Hack Club user info received:', {
      sub: userInfo.sub,
      hasName: !!userInfo.name,
      hasEmail: !!userInfo.email,
      hasSlackId: !!userInfo.slack_id,
      hasAddress: !!userInfo.address,
      hasBirthdate: !!userInfo.birthdate,
      birthdateType: typeof userInfo.birthdate,
      birthdateValue: userInfo.birthdate ? String(userInfo.birthdate).substring(0, 10) : null, // Log first 10 chars for debugging
      verification_status: userInfo.verification_status
    });

    // Check if user is verified - required for linking
    if (!userInfo.verification_status || userInfo.verification_status !== 'verified') {
      // User linked but is not verified - remove auth and tell them to get verified
      console.log('User linked Hack Club auth but verification_status is not verified:', userInfo.verification_status);
      
      // Clear all Hack Club auth fields
      /** @type {Record<string, any>} */
      const clearData = {
        hackclub_id: null,
        hackclub_name: null,
        hackclub_slack_id: null,
        hackclub_email: null,
        hackclub_address: null,
        hackclub_birthday: null,
        hackclub_verification_status: null
      };
      
      await base('User').update(user.recId, clearData);
      
      // Redirect with error message telling user to get verified
      throw redirect(302, '/home?hackclub_auth_error=' + encodeURIComponent('Please get verified and add an address in your Hack Club profile before linking again'));
    }

    // Check if user has an address - required for linking
    if (!userInfo.address || (typeof userInfo.address === 'object' && Object.keys(userInfo.address).length === 0)) {
      // User linked but has no address - remove auth and tell them to get verified + add address
      console.log('User linked Hack Club auth but has no address - removing auth');
      
      // Clear all Hack Club auth fields
      /** @type {Record<string, any>} */
      const clearData = {
        hackclub_id: null,
        hackclub_name: null,
        hackclub_slack_id: null,
        hackclub_email: null,
        hackclub_address: null,
        hackclub_birthday: null,
        hackclub_verification_status: null
      };
      
      await base('User').update(user.recId, clearData);
      
      // Redirect with error message telling user to get verified and add address
      throw redirect(302, '/home?hackclub_auth_error=' + encodeURIComponent('Please get verified and add an address in your Hack Club profile before linking again'));
    }

    // Format address as JSON string if it exists
    let addressJson = null;
    if (userInfo.address) {
      addressJson = JSON.stringify(userInfo.address);
    }

    // Update user record in Airtable with Hack Club data
    /** @type {Record<string, any>} */
    const updateData = {
      hackclub_id: userInfo.sub,
      hackclub_name: userInfo.name || null,
      hackclub_slack_id: userInfo.slack_id || null,
      hackclub_email: userInfo.email || null,
      hackclub_verification_status: userInfo.verification_status || null
    };

    // Only store address if it exists
    if (addressJson) {
      updateData.hackclub_address = addressJson;
    }

    // Only store birthdate if it exists
    if (userInfo.birthdate) {
      // Convert birthdate to string if it's not already
      const birthdateValue = String(userInfo.birthdate).trim();
      if (birthdateValue) {
        updateData.hackclub_birthday = birthdateValue;
        console.log('Storing birthdate:', birthdateValue.substring(0, 10)); // Log first 10 chars
      }
    } else {
      console.log('No birthdate found in Hack Club user info');
    }

    await base('User').update(user.recId, updateData);

    console.log('Successfully updated user with Hack Club data:', user.recId);

    // Redirect back to home with success
    throw redirect(302, '/home?hackclub_auth_success=true');

  } catch (err) {
    // If it's a redirect, re-throw it
    if (err && typeof err === 'object' && 'status' in err && err.status === 302) {
      throw err;
    }

    console.error('Hack Club Auth callback error:', err);
    throw redirect(302, '/home?hackclub_auth_error=' + encodeURIComponent('An unexpected error occurred'));
  }
}
