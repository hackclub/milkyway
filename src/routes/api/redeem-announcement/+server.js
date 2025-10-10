import { json } from '@sveltejs/kit';
import { markAnnouncementAsSeen, giveAnnouncementRewards } from '$lib/server/announcements.js';

export async function POST({ request, locals }) {
  try {
    if (!locals.user) {
      return json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { announcementId, prize } = await request.json();

    if (!announcementId) {
      return json({ success: false, error: 'Announcement ID required' }, { status: 400 });
    }

    // Give rewards if there are any
    let rewards = {};
    if (prize && prize.trim() !== '') {
      rewards = await giveAnnouncementRewards(locals.user.recId, prize);
    }

    // Mark as seen
    await markAnnouncementAsSeen(locals.user.recId, announcementId);

    return json({
      success: true,
      rewards
    });
  } catch (err) {
    console.error('Error redeeming announcement:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to redeem announcement';
    
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 500 });
  }
}

