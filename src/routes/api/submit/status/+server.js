import { json } from '@sveltejs/kit';
import { getUserInfoBySessionId } from '$lib/server/auth.js';

export async function GET({ url, cookies }) {
  try {
    // Check authentication
    const sessionId = cookies.get('sessionid');
    const userInfo = await getUserInfoBySessionId(sessionId);
    
    if (!userInfo) {
      return json({ success: false, error: { message: 'Authentication required' } }, { status: 401 });
    }

    // Get auth_id from query parameters
    const authId = url.searchParams.get('auth_id');
    if (!authId) {
      return json({ success: false, error: { message: 'auth_id is required' } }, { status: 400 });
    }

    // Proxy the request to submit.hackclub.com
    const response = await fetch(`https://submit.hackclub.com/api/authorize/${authId}/status`, {
      headers: {
        'Authorization': `Bearer ${process.env.IDV_KEY}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('External API error response:', errorText);
      throw new Error(`Failed to get authorization status: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return json(data);
    
  } catch (error) {
    console.error('Submit status API error:', error);
    return json({ 
      success: false, 
      error: { message: 'Failed to get authorization status' } 
    }, { status: 500 });
  }
}
