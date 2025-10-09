// go to airtable
// get the events tab
// return list of events n stuff

import { json } from '@sveltejs/kit';
import { getListOfEvents } from '$lib/server/events.js';

export async function GET() {
  try {
    const events = await getListOfEvents();
    return json({
      success: true,
      events
    });
  } catch (err) {
    console.error('Airtable error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to get events';
    
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 500 });
  }
}
