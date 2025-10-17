import { json } from '@sveltejs/kit';

export async function POST({ request, cookies }) {
  try {
    const sessionId = cookies.get('sessionid');
    
    if (!sessionId) {
      return json({
        success: false,
        error: 'No session found'
      }, { status: 401 });
    }

    // Get user info from session
    const { getUserInfoBySessionId } = await import('$lib/server/auth.js');
    const userInfo = await getUserInfoBySessionId(sessionId);
    
    if (!userInfo) {
      return json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Call the submit.hackclub.com API to create authorization
    const response = await fetch('https://submit.hackclub.com/api/authorize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.IDV_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Identity verification API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      return json({
        success: false,
        error: 'Failed to initiate identity verification'
      }, { status: 500 });
    }

    const result = await response.json();
    
    return json({
      success: true,
      data: result
    });

  } catch (err) {
    console.error('Identity verification error:', err);
    return json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
