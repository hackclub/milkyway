import { json } from '@sveltejs/kit';
import { uploadImageAttachment } from '$lib/server/attachments.js';
import { sanitizeErrorMessage, checkRateLimit, getClientIdentifier } from '$lib/server/security.js';
import { base } from '$lib/server/db.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { verifyFurnitureOwnership } from '$lib/server/furniture.js';

// POST - Upload project image using Airtable's uploadAttachment API
export async function POST({ request, locals, cookies }) {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Rate limiting: 10 image uploads per minute
		const clientId = getClientIdentifier(request, cookies);
		console.log(clientId.slice(8));

		if (!checkRateLimit(`image-upload:${clientId}`, 10, 60000)) {
			return json({ error: 'Too many image upload requests' }, { status: 429 });
		}

		const userInfo = await getUserInfoBySessionId(clientId.slice(8));

		const username = userInfo.username;
		const email = userInfo.email;

		const { id, imageData, filename, contentType } = await request.json();

		if (!username) {
			return json({ error: 'Username is required' }, { status: 400 });
		}

		if (!imageData) {
			return json({ error: 'Image data is required' }, { status: 400 });
		}

		const isOwner = await verifyFurnitureOwnership(id, email);
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
			return json(
				{ error: 'Invalid image type. Only JPEG, PNG, GIF, and WebP are allowed.' },
				{ status: 400 }
			);
		}

		// Extract filename and content type if not provided
		const finalFilename = filename || `project-image-${Date.now()}.jpg`;
		const finalContentType = contentType || 'image/jpeg';

		console.log('Uploading canvas image:', {
			username,
			id,
			filename: finalFilename,
			contentType: finalContentType,
			dataLength: imageData.length
		});

		// First, clear any existing images in the field to prevent old images from remaining
		try {
			await base('Furniture').update(id, {
				attachment: {}
			});
			console.log('Cleared existing images from canvas field');
		} catch (clearError) {
			console.warn('Failed to clear existing images (this is usually fine):', clearError);
			// Continue with upload even if clearing fails
		}

		// Upload image using Airtable's uploadAttachment API
		const attachmentData = await uploadImageAttachment(
			id,
			'attachment',
			imageData,
			finalFilename,
			finalContentType
		);

		console.log('Image uploaded successfully:', attachmentData);

		try {
			const data = {
				name: username,
				url: Object.values(attachmentData.fields)[0][0].url
			};
			await base('Furniture').update(id, {
				data: JSON.stringify(data)
			});
		} catch (err) {
			console.error(err);
		}

		return json({
			success: true,
			attachment: attachmentData,
			message: 'Image uploaded successfully'
		});
	} catch (error) {
		console.error('Error uploading canvas image:', error);
		return json(
			{
				error: sanitizeErrorMessage(/** @type {Error} */ (error), 'Failed to upload image')
			},
			{ status: 500 }
		);
	}
}
