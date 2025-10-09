import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { isValidUsername, escapeAirtableFormula, checkRateLimit, getClientIdentifier, sanitizeErrorMessage } from '$lib/server/security.js';

export async function POST({ request, cookies }) {
  try {
    // Require authentication to prevent username enumeration
    const sessionId = cookies.get('sessionid');
    if (!sessionId) {
      return json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { username } = await request.json();
    
    if (!username || username.trim() === '') {
      return json({
        success: false,
        error: 'Username is required'
      }, { status: 400 });
    }

    // Validate username format
    if (!isValidUsername(username.trim())) {
      return json({
        success: false,
        error: 'Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens'
      }, { status: 400 });
    }

    // Rate limiting: 20 checks per minute per client
    const clientId = getClientIdentifier(request, cookies);
    if (!checkRateLimit(`check-username:${clientId}`, 20, 60000)) {
      return json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    // Check if username already exists in Airtable User table
    const escapedUsername = escapeAirtableFormula(username.trim());
    const records = await base('User')
      .select({
        filterByFormula: `{username} = "${escapedUsername}"`,
        maxRecords: 1
      })
      .firstPage();

    const isAvailable = records.length === 0;

    return json({
      success: true,
      available: isAvailable,
      username: username.trim()
    });

  } catch (err) {
    console.error('Airtable error:', err);
    const errorMessage = sanitizeErrorMessage(err, 'Failed to check username');
    
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 500 });
  }
}
