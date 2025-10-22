import { getUserInfoByUsername } from '$lib/server/auth.js';
import { base } from '$lib/server/db.js';
import { escapeAirtableFormula } from '$lib/server/security.js';
import { getUserFurnitureByEmail } from '$lib/server/furniture.js';
import { getUserProjectsByEmail } from '$lib/server/projects.js';

export async function load({ params, locals }) {
  try {
    // Fetch user info by username
    console.log('Fetching user info for:', params.username);
    const userInfo = await getUserInfoByUsername(params.username);
    console.log('User info fetched:', userInfo ? 'success' : 'not found');
    
    if (!userInfo) {
      return {
        username: params.username,
        isLoggedIn: !!locals.user,
        currentUser: locals.user ? {
          recId: locals.user.recId,
          username: locals.user.username
        } : null,
        user: null,
        projects: [],
        furniture: [],
        error: 'User not found'
      };
    }
    
    // Fetch user's projects and furniture using the SAME functions as /friends
    // NOTE: We use email internally but DON'T expose it to the client
    const userEmail = userInfo.email;
    console.log('Fetching projects and furniture for user:', userEmail);
    const projects = await getUserProjectsByEmail(userEmail);
    const furniture = await getUserFurnitureByEmail(userEmail);
    
    // Remove email from userInfo before sending to client (SECURITY)
    delete userInfo.email;
    
    // Get follower/following counts
    console.log('Fetching follower/following counts...');
    const targetUserRecord = await base('User').find(userInfo.recId);
    const followingField = targetUserRecord.fields.following;
    const followingList = Array.isArray(followingField) ? followingField : [];
    const followingCount = followingList.length;
    
    // Count how many users follow this user (find users who have this user in their following list)
    const allUsers = await base('User')
      .select({
        fields: ['following']
      })
      .all();
    
    const followerCount = allUsers.filter(user => {
      const following = user.fields.following;
      const followingArray = Array.isArray(following) ? following : [];
      return followingArray.includes(userInfo.recId);
    }).length;
    
    // Check if current user is following this user
    let isFollowing = false;
    if (locals.user) {
      const currentUserRecord = await base('User').find(locals.user.recId);
      const currentFollowing = currentUserRecord.fields.following;
      const currentFollowingArray = Array.isArray(currentFollowing) ? currentFollowing : [];
      isFollowing = currentFollowingArray.includes(userInfo.recId);
    }
    
    return {
      username: params.username,
      isLoggedIn: !!locals.user,
      currentUser: locals.user ? {
        recId: locals.user.recId,
        username: locals.user.username
      } : null,
      user: {
        ...userInfo,
        followerCount,
        followingCount
      },
      projects,
      furniture,
      isFollowing
    };
  } catch (error) {
    console.error('Error loading user profile:', error);
    return {
      username: params.username,
      isLoggedIn: !!locals.user,
      currentUser: locals.user ? {
        recId: locals.user.recId,
        username: locals.user.username
      } : null,
      user: null,
      projects: [],
      furniture: [],
      error: 'Failed to load user profile'
    };
  }
}

