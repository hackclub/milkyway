import { json } from '@sveltejs/kit';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { env } from '$env/dynamic/private';

export async function POST({ request, cookies }) {
  try {
    // Check authentication
    const sessionId = cookies.get('sessionid');
    const userInfo = await getUserInfoBySessionId(sessionId);
    
    if (!userInfo) {
      return json({ success: false, error: { message: 'Authentication required' } }, { status: 401 });
    }

    // Proxy the request to submit.hackclub.com
    const response = await fetch('https://submit.hackclub.com/api/authorize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.IDV_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to create authorization request');
    }

    const data = await response.json();
    return json(data);
    
  } catch (error) {
    console.error('Submit authorize API error:', error);
    return json({ 
      success: false, 
      error: { message: 'Failed to create authorization request' } 
    }, { status: 500 });
  }
}
