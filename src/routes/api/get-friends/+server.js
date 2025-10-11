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

    // Step 1: Fetch ONLY users with usernames (lightweight - just username field)
    const userRecords = await base('User')
      .select({
        filterByFormula: `AND({email} != "${escapedEmail}", {username} != "")`,
        fields: ['email', 'username'],
        // Try to get more than we need to account for users without projects
        maxRecords: count * 4
      })
      .all();

    if (userRecords.length === 0) {
      return json({ success: true, friends: [] });
    }

    // Step 2: Shuffle and pick random users FIRST (before fetching heavy data)
    const shuffled = userRecords.sort(() => 0.5 - Math.random());
    
    // Step 3: Fetch projects/furniture ONLY for selected users (one at a time until we have enough)
    const selectedFriends = [];
    
    for (const userRecord of shuffled) {
      if (selectedFriends.length >= count) break;
      
      const email = String(userRecord.fields.email || '');
      const projects = await getUserProjectsByEmail(email);
      
      // Only include users who have projects
      if (projects.length > 0) {
        const furniture = await getUserFurnitureByEmail(email);
        selectedFriends.push({
          id: userRecord.id,
          // DO NOT expose email to frontend - privacy concern
          username: String(userRecord.fields.username || ''),
          projects: projects,
          furniture: furniture
        });
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

