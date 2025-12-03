import { json, error } from '@sveltejs/kit';
import { uploadImageAttachment } from '$lib/server/attachments.js';
import { sanitizeErrorMessage, checkRateLimit, getClientIdentifier } from '$lib/server/security.js';

const BLACKHOLE_TABLE = 'BlackholeSubmissions';

// POST - Upload screenshot to blackhole submission
export async function POST({ request, locals, cookies }) {
  try {
    if (!locals.user) {
      throw error(401, 'Unauthorized');
    }

    // Rate limiting: 10 image uploads per minute
    const clientId = getClientIdentifier(request, cookies);
    if (!checkRateLimit(`blackhole-image:${clientId}`, 10, 60000)) {
      throw error(429, 'Too many image upload requests');
    }

    const { submissionId, imageData, filename } = await request.json();

    if (!submissionId) {
      throw error(400, 'Submission ID is required');
    }

    if (!imageData) {
      throw error(400, 'Image data is required');
    }

    // Validate submissionId format (Airtable record IDs)
    if (!/^rec[a-zA-Z0-9]{14}$/.test(submissionId)) {
      throw error(400, 'Invalid submission ID format');
    }

    // Validate image data format
    if (!imageData.startsWith('data:image/')) {
      throw error(400, 'Invalid image format');
    }

    // Validate image size (max 5MB base64)
    const maxSize = 5 * 1024 * 1024;
    if (imageData.length > maxSize) {
      throw error(400, 'Image too large. Maximum size is 5MB.');
    }

    // Extract content type from data URL
    const contentTypeMatch = imageData.match(/^data:(image\/[^;]+);base64,/);
    const contentType = contentTypeMatch ? contentTypeMatch[1] : 'image/jpeg';

    // Validate content type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(contentType)) {
      throw error(400, 'Invalid image type. Only JPEG, PNG, GIF, and WebP are allowed.');
    }

    const finalFilename = filename || `screenshot-${Date.now()}.jpg`;

    console.log('Uploading blackhole screenshot:', {
      submissionId,
      filename: finalFilename,
      contentType,
      dataLength: imageData.length
    });

    // Upload image using Airtable's uploadAttachment API
    // The field name in Airtable should be 'Screenshots' (attachment type)
    const attachmentData = await uploadImageAttachment(
      submissionId,
      'Screenshots',
      imageData,
      finalFilename,
      contentType
    );

    console.log('Screenshot uploaded successfully:', attachmentData);

    return json({
      success: true,
      attachment: attachmentData,
      message: 'Screenshot uploaded successfully'
    });

  } catch (err) {
    console.error('Error uploading blackhole screenshot:', err);
    
    // If it's already a SvelteKit error, rethrow it
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    
    return json({
      error: sanitizeErrorMessage(/** @type {Error} */ (err), 'Failed to upload screenshot')
    }, { status: 500 });
  }
}

