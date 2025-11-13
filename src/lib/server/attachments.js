/**
 * Upload an attachment (image, video, etc.) to Airtable
 * @param {string} recordId - The Airtable record ID
 * @param {string} attachmentFieldName - The field name for attachments (e.g., 'attachments')
 * @param {string} base64DataUrl - Base64 data URL for the file
 * @param {string} filename - The filename for the attachment
 * @param {string} contentType - The MIME type of the file (e.g., 'image/jpeg', 'video/mp4')
 * @returns {Promise<Object>} The uploaded attachment object
 */
export async function uploadImageAttachment(
	recordId,
	attachmentFieldName,
	base64DataUrl,
	filename,
	contentType = 'image/jpeg'
) {
	try {
		// Remove generic data URL prefix if present (e.g., "data:image/jpeg;base64," or "data:video/mp4;base64,")
		const base64Data = base64DataUrl.replace(/^data:[^;]+;base64,/, '');

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
		console.error('Error uploading attachment:', error);
		throw new Error(`Failed to upload attachment: ${error.message}`);
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
	if (typeof attachmentField === 'object') {
		return attachmentField;
	}

	return null;
}

/**
 * Upload an attachment (alias) - forwards to uploadImageAttachment
 * @deprecated Prefer uploadImageAttachment, this alias exists for clarity
 */
export const uploadAttachment = (
	recordId,
	attachmentFieldName,
	base64DataUrl,
	filename,
	contentType
) => uploadImageAttachment(recordId, attachmentFieldName, base64DataUrl, filename, contentType);
