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

    // SECURITY: Verify the announcement is actually eligible for redemption
    // This prevents users from redeeming arbitrary announcements or replaying old ones
    const { getVisibleAnnouncements } = await import('$lib/server/announcements.js');
    const visibleAnnouncements = await getVisibleAnnouncements(locals.user.recId);
    
    const announcement = visibleAnnouncements.find(a => a.id === announcementId);
    if (!announcement) {
      return json({ 
        success: false, 
        error: 'Announcement not found or already redeemed' 
      }, { status: 403 });
    }

    // SECURITY: Use the prize from the database, not from the client request
    // This prevents users from modifying the prize amount
    const actualPrize = announcement.prize || '';

    // Give rewards if there are any
    let rewards = {};
    if (actualPrize.trim() !== '') {
      rewards = await giveAnnouncementRewards(locals.user.recId, actualPrize);
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

