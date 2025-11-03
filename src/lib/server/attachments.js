import { base } from './db.js';

/**
 * Upload an image attachment to Airtable
 * @param {string} recordId - The Airtable record ID
 * @param {string} attachmentFieldName - The field name for attachments (e.g., 'image')
 * @param {string} base64Image - Base64 encoded image data
 * @param {string} filename - The filename for the attachment
 * @param {string} contentType - The MIME type of the image
 * @returns {Promise<Object>} The uploaded attachment object
 */
export async function uploadImageAttachment(
	recordId,
	attachmentFieldName,
	base64Image,
	filename,
	contentType = 'image/jpeg'
) {
	try {
		// Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
		const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

		// Get the base ID from environment
		const baseId = process.env.AIRTABLE_BASE_ID;
		if (!baseId) {
			throw new Error('AIRTABLE_BASE_ID environment variable not set');
		}

		// Get the API key
		const apiKey = process.env.AIRTABLE_API_KEY;
		if (!apiKey) {
			throw new Error('AIRTABLE_API_KEY environment variable not set');
		}

		// Upload attachment using Airtable's attachment API
		const uploadResponse = await fetch(
			`https://content.airtable.com/v0/${baseId}/${recordId}/${attachmentFieldName}/uploadAttachment`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					contentType: contentType,
					file: base64Data,
					filename: filename
				})
			}
		);

		if (!uploadResponse.ok) {
			const errorText = await uploadResponse.text();
			throw new Error(`Attachment upload failed: ${uploadResponse.status} ${errorText}`);
		}

		const attachmentData = await uploadResponse.json();
		console.log('Successfully uploaded attachment:', {
			recordId,
			attachmentFieldName,
			filename,
			attachmentId: attachmentData.id
		});

		return attachmentData;
	} catch (error) {
		console.error('Error uploading image attachment:', error);
		throw new Error(`Failed to upload image: ${error.message}`);
	}
}

/**
 * Get attachment URL from Airtable attachment object
 * @param {Object} attachment - Airtable attachment object
 * @returns {string} The URL to access the attachment
 */
export function getAttachmentUrl(attachment) {
	if (!attachment || !attachment.url) {
		return '';
	}
	return attachment.url;
}

/**
 * Get the first attachment from a field that contains multiple attachments
 * @param {Array|Object|undefined} attachmentField - The attachment field from Airtable
 * @returns {Object|null} The first attachment or null
 */
export function getFirstAttachment(attachmentField) {
	if (!attachmentField) return null;

	// If it's an array, get the first item
	if (Array.isArray(attachmentField)) {
		return attachmentField.length > 0 ? attachmentField[0] : null;
	}

	// If it's a single object, return it
	if (typeof attachmentField === 'object' && attachmentField !== null) {
		return attachmentField;
	}

	return null;
}
