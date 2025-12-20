import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { uploadImageAttachment } from '$lib/server/attachments.js';
import { verifyProjectOwnership } from '$lib/server/projects.js';
import { checkRateLimit, getClientIdentifier, sanitizeErrorMessage } from '$lib/server/security.js';

export async function POST({ request, cookies }) {
  try {
    const sessionId = cookies.get('sessionid');
    
    if (!sessionId) {
      return json({
        success: false,
        error: 'No session found'
      }, { status: 401 });
    }

    const { getUserInfoBySessionId } = await import('$lib/server/auth.js');
    const userInfo = await getUserInfoBySessionId(sessionId);
    
    if (!userInfo || !userInfo.email) {
      return json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Rate limiting: 10 artlog creations per minute
    const clientId = getClientIdentifier(request, cookies);
    if (!checkRateLimit(`artlog-create:${clientId}`, 10, 60000)) {
      return json({ error: 'Too many artlog creation requests' }, { status: 429 });
    }

    const { projectId, hours, description, proof, imageData } = await request.json();
    
    if (!projectId || !hours || !description || !proof || !imageData) {
      return json({
        success: false,
        error: 'All fields are required (including screenshot)'
      }, { status: 400 });
    }

    // Validate projectId format (should be Airtable record ID)
    if (typeof projectId !== 'string' || !projectId.startsWith('rec')) {
      return json({
        success: false,
        error: 'Invalid project ID format'
      }, { status: 400 });
    }

    // Verify project ownership
    const isOwner = await verifyProjectOwnership(projectId, String(userInfo.email));
    if (!isOwner) {
      return json({
        success: false,
        error: 'Forbidden'
      }, { status: 403 });
    }

    // Validate hours is a positive number with reasonable bounds
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 100) {
      return json({
        success: false,
        error: 'Hours must be between 0 and 100'
      }, { status: 400 });
    }
    
    // Get project data to validate 30% art hours cap
    const projectRecord = await base('Projects').find(projectId);
    const currentCodeHours = typeof projectRecord.fields.hackatimeHours === 'number' ? projectRecord.fields.hackatimeHours : 0;
    const currentArtHours = typeof projectRecord.fields.artHours === 'number' ? projectRecord.fields.artHours : 0;
    
    // Calculate max art hours allowed (30% of total)
    // artMax / (code + artMax) = 0.30 => artMax = (0.30 / 0.70) * code
    const maxArtHours = (currentCodeHours * 0.3) / 0.7;
    const remainingArtHours = Math.max(0, maxArtHours - currentArtHours);
    
    if (hoursNum > remainingArtHours + 0.01) { // Small epsilon for floating point comparison
      return json({
        success: false,
        error: `Art hours exceed the 30% cap. You can log up to ${Math.floor(remainingArtHours * 100) / 100} more art hours.`
      }, { status: 400 });
    }

    // Validate description
    if (typeof description !== 'string' || description.trim().length === 0 || description.length > 2000) {
      return json({
        success: false,
        error: 'Description must be between 1 and 2000 characters'
      }, { status: 400 });
    }

    // Validate proof is a valid URL
    let proofUrl;
    try {
      proofUrl = new URL(proof);
      if (!['http:', 'https:'].includes(proofUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return json({
        success: false,
        error: 'Proof must be a valid HTTP or HTTPS URL'
      }, { status: 400 });
    }

    // Validate image data format and size
    if (typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
      return json({
        success: false,
        error: 'Invalid image format'
      }, { status: 400 });
    }

    // Validate image size (max 5MB base64)
    if (imageData.length > 5 * 1024 * 1024) {
      return json({
        success: false,
        error: 'Image too large. Maximum size is 5MB.'
      }, { status: 413 });
    }

    // Create artlog in Airtable
    const artlogData = {
      hours: hoursNum,
      description: description.trim(),
      proof: proof.trim(),
      Projects: [projectId] // Link using record ID when creating
    };

    const result = await base('Artlog').create(artlogData);

    // Upload image (required)
    try {
      await uploadImageAttachment(
        result.id,
        'image',
        imageData,
        `artlog-${Date.now()}.jpg`,
        'image/jpeg'
      );
    } catch (imageError) {
      console.error('Error uploading artlog image:', imageError);
      // Delete the artlog if image upload fails since image is required
      await base('Artlog').destroy(result.id);
      return json({
        success: false,
        error: 'Failed to upload image'
      }, { status: 500 });
    }

    return json({
      success: true,
      artlogId: result.id
    });

  } catch (error) {
    console.error('Error creating artlog:', error);
    return json({
      success: false,
      error: 'Failed to create artlog'
    }, { status: 500 });
  }
}
