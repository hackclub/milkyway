import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { getUserProjectsByEmail } from '$lib/server/projects.js';
import { getUserFurnitureByEmail } from '$lib/server/furniture.js';
import { escapeAirtableFormula } from '$lib/server/security.js';

export async function GET({ url, locals }) {
  if (!locals.user) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const count = parseInt(url.searchParams.get('count') || '6', 10);
    const escapedEmail = escapeAirtableFormula(locals.user.email);

    // Get current user's following list first
    const currentUserRecord = await base('User').find(locals.user.recId);
    const followingField = currentUserRecord.fields.following;
    const following = Array.isArray(followingField) ? followingField : [];

    const selectedFriends = [];

    // Step 1: Fetch users you follow first (if any)
    if (following.length > 0) {
      for (const followedUserId of following) {
        if (selectedFriends.length >= count) break;
        
        try {
          const followedUser = await base('User').find(followedUserId);
          const username = String(followedUser.fields.username || '');
          
          // Only include if they have a username
          if (username) {
            const email = String(followedUser.fields.email || '');
            const projects = await getUserProjectsByEmail(email);
            
            // Only include users who have projects
            if (projects.length > 0) {
              const furniture = await getUserFurnitureByEmail(email);
              selectedFriends.push({
                id: followedUser.id,
                username: username,
                projects: projects,
                furniture: furniture,
                isFollowing: true
              });
            }
          }
        } catch (error) {
          console.error('Error fetching followed user:', error);
          // Skip this user and continue
        }
      }
    }

    // Step 2: If we need more users, fill with random users
    if (selectedFriends.length < count) {
      const userRecords = await base('User')
        .select({
          filterByFormula: `AND({email} != "${escapedEmail}", {username} != "")`,
          fields: ['email', 'username'],
          maxRecords: count * 4
        })
        .all();

      // Filter out users we already added and shuffle
      const followedIds = selectedFriends.map(f => f.id);
      const otherUsers = userRecords.filter(u => !followedIds.includes(u.id));
      const shuffled = [...otherUsers].sort(() => 0.5 - Math.random());

      for (const userRecord of shuffled) {
        if (selectedFriends.length >= count) break;
        
        const email = String(userRecord.fields.email || '');
        const projects = await getUserProjectsByEmail(email);
        
        // Only include users who have projects
        if (projects.length > 0) {
          const furniture = await getUserFurnitureByEmail(email);
          selectedFriends.push({
            id: userRecord.id,
            username: String(userRecord.fields.username || ''),
            projects: projects,
            furniture: furniture,
            isFollowing: false
          });
        }
      }
    }

    return json({
      success: true,
      friends: selectedFriends
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    return json({ error: 'Failed to fetch friends' }, { status: 500 });
  }
}

