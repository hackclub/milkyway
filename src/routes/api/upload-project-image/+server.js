import { json } from '@sveltejs/kit';
import { uploadImageAttachment } from '$lib/server/attachments.js';
import { verifyProjectOwnership, updateProject } from '$lib/server/projects.js';
import { sanitizeErrorMessage, checkRateLimit, getClientIdentifier } from '$lib/server/security.js';
import { base } from '$lib/server/db.js';

// POST - Upload project image using Airtable's uploadAttachment API
export async function POST({ request, locals, cookies }) {
  try {
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 10 image uploads per minute
    const clientId = getClientIdentifier(request, cookies);
    if (!checkRateLimit(`image-upload:${clientId}`, 10, 60000)) {
      return json({ error: 'Too many image upload requests' }, { status: 429 });
    }

    const { projectId, imageData, filename, contentType } = await request.json();

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!imageData) {
      return json({ error: 'Image data is required' }, { status: 400 });
    }

    // Validate projectId format (Airtable record IDs)
    if (!/^rec[a-zA-Z0-9]{14}$/.test(projectId)) {
      return json({ error: 'Invalid project ID format' }, { status: 400 });
    }

    // Verify project ownership
    const isOwner = await verifyProjectOwnership(projectId, locals.user.email);
    if (!isOwner) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate image data format and size
    if (!imageData.startsWith('data:image/')) {
      return json({ error: 'Invalid image format' }, { status: 400 });
    }

    // Validate image size (max 5MB base64 = ~3.7MB actual)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (imageData.length > maxSize) {
      return json({ error: 'Image too large. Maximum size is 5MB.' }, { status: 400 });
    }

    // Validate content type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (contentType && !validTypes.includes(contentType)) {
      return json({ error: 'Invalid image type. Only JPEG, PNG, GIF, and WebP are allowed.' }, { status: 400 });
    }

    // Extract filename and content type if not provided
    const finalFilename = filename || `project-image-${Date.now()}.jpg`;
    const finalContentType = contentType || 'image/jpeg';

    console.log('Uploading project image:', {
      projectId,
      filename: finalFilename,
      contentType: finalContentType,
      dataLength: imageData.length
    });

    // First, clear any existing images in the field to prevent old images from remaining
    try {
      await base('Projects').update(projectId, {
        'image': []
      });
      console.log('Cleared existing images from project field');
    } catch (clearError) {
      console.warn('Failed to clear existing images (this is usually fine):', clearError);
      // Continue with upload even if clearing fails
    }

    // Upload image using Airtable's uploadAttachment API
    const attachmentData = await uploadImageAttachment(
      projectId, 
      'image', 
      imageData, 
      finalFilename, 
      finalContentType
    );

    console.log('Image uploaded successfully:', attachmentData);

    return json({ 
      success: true, 
      attachment: attachmentData,
      message: 'Image uploaded successfully' 
    });

  } catch (error) {
    console.error('Error uploading project image:', error);
    return json({
      error: sanitizeErrorMessage(/** @type {Error} */ (error), 'Failed to upload image')
    }, { status: 500 });
  }
}
