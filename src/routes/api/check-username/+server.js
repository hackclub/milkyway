import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';

export async function POST({ request }) {
  try {
    const { username } = await request.json();
    
    if (!username || username.trim() === '') {
      return json({
        success: false,
        error: 'Username is required'
      }, { status: 400 });
    }

    // Check if username already exists in Airtable User table
    const records = await base('User')
      .select({
        filterByFormula: `{username} = "${username.trim()}"`,
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
    const errorMessage = err instanceof Error ? err.message : 'Failed to check username';
    
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 500 });
  }
}
