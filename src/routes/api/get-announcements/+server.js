import { json } from '@sveltejs/kit';
import { getVisibleAnnouncements } from '$lib/server/announcements.js';

export async function GET({ locals }) {
  try {
    if (!locals.user) {
      return json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const announcements = await getVisibleAnnouncements(locals.user.recId);
    
    return json({
      success: true,
      announcements
    });
  } catch (err) {
    console.error('Error fetching announcements:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to get announcements';
    
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 500 });
  }
}

