import { redirect } from '@sveltejs/kit';
import crypto from 'crypto';

const HACKCLUB_AUTH_URL = 'https://auth.hackclub.com/oauth/authorize';
const HACKCLUB_CLIENT_ID = process.env.HACKCLUB_CLIENT_ID;

/**
 * Initiates the Hack Club Auth OIDC flow
 * GET /api/hackclub-auth/authorize
 */
export async function GET({ cookies, url }) {
  // Verify user is logged in
  const sessionId = cookies.get('sessionid');
  
  if (!sessionId) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Not authenticated'
    }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify client ID is configured
  if (!HACKCLUB_CLIENT_ID) {
    console.error('HACKCLUB_CLIENT_ID is not configured');
    return new Response(JSON.stringify({
      success: false,
      error: 'Hack Club Auth is not configured'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Generate CSRF state token
  const state = crypto.randomBytes(32).toString('hex');
  
  // Store state in cookie for verification on callback
  cookies.set('hackclub_auth_state', state, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10 // 10 minutes
  });

  // Build the authorization URL
  const baseUrl = url.origin;
  const redirectUri = `${baseUrl}/api/hackclub-auth/callback`;
  
  // Request scopes - HQ official status allows all scopes including address
  const scopes = ['openid', 'profile', 'email', 'address', 'verification_status', 'slack_id', 'name', 'birthdate'];
  
  const authUrl = new URL(HACKCLUB_AUTH_URL);
  authUrl.searchParams.set('client_id', HACKCLUB_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes.join(' '));
  authUrl.searchParams.set('state', state);

  // Redirect to Hack Club Auth
  throw redirect(302, authUrl.toString());
}
