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

    // Fetch all users except current user
    const userRecords = await base('User')
      .select({
        filterByFormula: `{email} != "${escapedEmail}"`,
        fields: ['email', 'username']
      })
      .all();

    // Filter out users without usernames
    const usersWithUsernames = userRecords.filter(record => record.fields.username);

    // Fetch projects and furniture for ALL users first
    const allUsersWithProjects = await Promise.all(
      usersWithUsernames.map(async (userRecord) => {
        const email = String(userRecord.fields.email || '');
        const projects = await getUserProjectsByEmail(email);
        const furniture = await getUserFurnitureByEmail(email);
        return {
          id: userRecord.id,
          email: email,
          username: String(userRecord.fields.username || ''),
          projects: projects,
          furniture: furniture
        };
      })
    );

    // Filter to only users WITH projects
    const friendsWithProjects = allUsersWithProjects.filter(user => user.projects.length > 0);

    // Shuffle and pick random count
    const shuffled = friendsWithProjects.sort(() => 0.5 - Math.random());
    const selectedFriends = shuffled.slice(0, count);

    return json({
      success: true,
      friends: selectedFriends
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    return json({ error: 'Failed to fetch friends' }, { status: 500 });
  }
}

