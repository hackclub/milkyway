import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { isValidUsername, escapeAirtableFormula, sanitizeErrorMessage } from '$lib/server/security.js';

export async function POST({ request, cookies }) {
  try {
    const { username, email, bio, githubUsername, howDidYouHear, doingWell, improve } = await request.json();
    const sessionId = cookies.get('sessionid');
    
    if (!sessionId) {
      return json({
        success: false,
        error: 'No session found'
      }, { status: 401 });
    }

    // Get user info from session
    const { getUserInfoBySessionId } = await import('$lib/server/auth.js');
    const user = await getUserInfoBySessionId(sessionId);
    
    if (!user) {
      return json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Prepare update object
    const updateData = {};

    // Validate and update username if provided
    if (username !== undefined) {
      if (!username || username.trim() === '') {
        return json({
          success: false,
          error: 'Username is required'
        }, { status: 400 });
      }

      // Validate username format
      if (!isValidUsername(username.trim())) {
        return json({
          success: false,
          error: 'Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens'
        }, { status: 400 });
      }

      // Check if username is already taken (only if different from current)
      if (username.trim() !== user.username) {
        const escapedUsername = escapeAirtableFormula(username.trim());
        const existingRecords = await base('User')
          .select({
            filterByFormula: `{username} = "${escapedUsername}"`,
            maxRecords: 1
          })
          .firstPage();

        if (existingRecords.length > 0 && existingRecords[0].id !== user.recId) {
          return json({
            success: false,
            error: 'Username is already taken'
          }, { status: 400 });
        }
      }

      updateData.username = username.trim();
    }

    // Validate and update email if provided
    if (email !== undefined) {
      if (!email || email.trim() === '') {
        return json({
          success: false,
          error: 'Email is required'
        }, { status: 400 });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return json({
          success: false,
          error: 'Please enter a valid email address'
        }, { status: 400 });
      }

      // Check if email is already taken (only if different from current)
      if (email.trim() !== user.email) {
        const escapedEmail = escapeAirtableFormula(email.trim());
        const existingRecords = await base('User')
          .select({
            filterByFormula: `{email} = "${escapedEmail}"`,
            maxRecords: 1
          })
          .firstPage();

        if (existingRecords.length > 0 && existingRecords[0].id !== user.recId) {
          return json({
            success: false,
            error: 'Email is already taken'
          }, { status: 400 });
        }
      }

      updateData.email = email.trim();
    }

    // Update bio if provided (no validation needed, just trim)
    if (bio !== undefined) {
      updateData.bio = bio.trim();
    }

    // Update githubUsername if provided
    if (githubUsername !== undefined) {
      updateData.githubUsername = githubUsername.trim();
    }


    // Update howDidYouHear if provided
    if (howDidYouHear !== undefined) {
      updateData.howDidYouHear = howDidYouHear.trim();
    }

    // Update doingWell if provided
    if (doingWell !== undefined) {
      updateData.doingWell = doingWell.trim();
    }

    // Update improve if provided
    if (improve !== undefined) {
      updateData.improve = improve.trim();
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      return json({
        success: true,
        message: 'No changes to update'
      });
    }

    // Update user's profile in Airtable
    await base('User').update(user.recId, updateData);

    return json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (err) {
    console.error('Airtable error:', err);
    const errorMessage = sanitizeErrorMessage(err, 'Failed to update profile');
    
    return json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
