import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { escapeAirtableFormula } from '$lib/server/security.js';

export async function POST({ request, locals }) {
  if (!locals.user) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { userId, action } = await request.json();

    if (!userId || !action) {
      return json({ error: 'Missing userId or action' }, { status: 400 });
    }

    if (action !== 'follow' && action !== 'unfollow') {
      return json({ error: 'Invalid action' }, { status: 400 });
    }

    const currentUserRecId = locals.user.recId;

    // Get current user's following list
    const userRecord = await base('User').find(currentUserRecId);
    const currentFollowing = userRecord.fields.following || [];

    let newFollowing;
    if (action === 'follow') {
      // Add to following list if not already there
      if (!currentFollowing.includes(userId)) {
        newFollowing = [...currentFollowing, userId];
      } else {
        newFollowing = currentFollowing;
      }
    } else {
      // Remove from following list
      newFollowing = currentFollowing.filter(id => id !== userId);
    }

    // Update the user record
    await base('User').update(currentUserRecId, {
      following: newFollowing
    });

    return json({
      success: true,
      isFollowing: action === 'follow'
    });
  } catch (error) {
    console.error('Error toggling follow:', error);
    return json({ error: 'Failed to update follow status' }, { status: 500 });
  }
}

