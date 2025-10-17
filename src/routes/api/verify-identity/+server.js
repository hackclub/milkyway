import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { escapeAirtableFormula } from '$lib/server/security.js';

export async function POST({ request, cookies }) {
  try {
    const sessionId = cookies.get('sessionid');
    const userInfo = await getUserInfoBySessionId(sessionId);
    
    if (!userInfo) {
      return json({ success: false, error: { message: 'Authentication required' } }, { status: 401 });
    }

    const { action, idvRec } = await request.json();
    
    if (action === 'save_verification') {
      // Save the idv_rec from the client-side verification
      if (!idvRec) {
        return json({ success: false, error: { message: 'IDV record is required' } }, { status: 400 });
      }
      
      try {
        // Store the idv_rec in Airtable
        const usersTable = base('User');
        await usersTable.update(userInfo.recId, {
          idv: idvRec
        });
        
        return json({ 
          success: true, 
          message: 'Identity verification saved successfully'
        });
        
      } catch (error) {
        console.error('Error saving identity verification:', error);
        return json({ 
          success: false, 
          error: { message: 'Failed to save identity verification' } 
        }, { status: 500 });
      }
    }
    
    return json({ success: false, error: { message: 'Invalid action' } }, { status: 400 });
    
  } catch (error) {
    console.error('Identity verification API error:', error);
    return json({ 
      success: false, 
      error: { message: 'Internal server error' } 
    }, { status: 500 });
  }
}

export async function GET({ cookies }) {
  try {
    const sessionId = cookies.get('sessionid');
    const userInfo = await getUserInfoBySessionId(sessionId);
    
    if (!userInfo) {
      return json({ success: false, error: { message: 'Authentication required' } }, { status: 401 });
    }

    // Check if user is already verified
    const usersTable = base('User');
    const userRecord = await usersTable.find(userInfo.recId);
    const isVerified = !!(userRecord.fields.idv && userRecord.fields.idv.trim() !== '');
    
    return json({ 
      success: true, 
      isVerified,
      idvRec: userRecord.fields.idv || null
    });
    
  } catch (error) {
    console.error('Identity verification status API error:', error);
    return json({ 
      success: false, 
      error: { message: 'Internal server error' } 
    }, { status: 500 });
  }
}
