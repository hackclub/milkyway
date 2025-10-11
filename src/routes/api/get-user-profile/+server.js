import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { getUserProjectsByEmail } from '$lib/server/projects.js';
import { getUserFurnitureByEmail } from '$lib/server/furniture.js';
import { escapeAirtableFormula } from '$lib/server/security.js';

export async function GET({ url, locals }) {
  try {
    const username = url.searchParams.get('username');

    if (!username) {
      return json({ error: 'Username is required' }, { status: 400 });
    }

    const escapedUsername = escapeAirtableFormula(username);

    // Fetch user by username
    const userRecords = await base('User')
      .select({
        filterByFormula: `{username} = "${escapedUsername}"`,
        maxRecords: 1,
        fields: ['email', 'username', 'coins', 'stellarships', 'paintchips', 'following']
      })
      .all();

    if (userRecords.length === 0) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    const userRecord = userRecords[0];
    const email = String(userRecord.fields.email || '');

    // Fetch user's projects and furniture
    const projects = await getUserProjectsByEmail(email);
    const furniture = await getUserFurnitureByEmail(email);

    // Get following count (how many people this user follows)
    const followingField = userRecord.fields.following;
    const followingCount = Array.isArray(followingField) ? followingField.length : 0;
    

    // Get follower count (how many people follow this user)
    // IMPORTANT: ARRAYJOIN on linked records returns PRIMARY FIELD values (email), not record IDs!
    let followerCount = 0;
    try {
      const followerRecords = await base('User')
        .select({
          filterByFormula: `FIND("${email}", ARRAYJOIN({following}, ","))`,
          fields: ['username', 'following']
        })
        .all();
      
      followerCount = followerRecords.length;
    } catch (error) {
      console.error('Error fetching follower count:', error);
    }

    // Check if current user is following this user (if logged in)
    let isFollowing = false;
    if (locals.user) {
      const currentUserRecord = await base('User').find(locals.user.recId);
      const following = currentUserRecord.fields.following || [];
      isFollowing = Array.isArray(following) && following.includes(userRecord.id);
    }

    // Return public user data (no email!)
    return json({
      success: true,
      user: {
        id: userRecord.id,
        username: String(userRecord.fields.username || ''),
        coins: userRecord.fields.coins || 0,
        stellarships: userRecord.fields.stellarships || 0,
        paintchips: userRecord.fields.paintchips || 0,
        followerCount,
        followingCount
      },
      projects,
      furniture,
      isFollowing,
      isLoggedIn: !!locals.user
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}

