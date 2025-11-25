/**
 * Server-side validation utilities
 */

// Content length limits
export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 5000;
export const MAX_COMMENT_LENGTH = 500;
export const MAX_ATTACHMENTS = 5;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed file types
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

/**
 * Validate devlog title
 * @param {string} title
 * @returns {{valid: boolean, error?: string}}
 */
export function validateTitle(title) {
	if (!title || typeof title !== 'string') {
		return { valid: false, error: 'Title is required' };
	}
	
	const trimmed = title.trim();
	if (trimmed.length === 0) {
		return { valid: false, error: 'Title cannot be empty' };
	}
	
	if (trimmed.length > MAX_TITLE_LENGTH) {
		return { valid: false, error: `Title must be ${MAX_TITLE_LENGTH} characters or less` };
	}
	
	return { valid: true };
}

/**
 * Validate devlog description
 * @param {string} description
 * @returns {{valid: boolean, error?: string}}
 */
export function validateDescription(description) {
	if (!description || typeof description !== 'string') {
		return { valid: false, error: 'Description is required' };
	}
	
	const trimmed = description.trim();
	if (trimmed.length === 0) {
		return { valid: false, error: 'Description cannot be empty' };
	}
	
	if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
		return { valid: false, error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less` };
	}
	
	return { valid: true };
}

/**
 * Validate comment content
 * @param {string} content
 * @returns {{valid: boolean, error?: string}}
 */
export function validateComment(content) {
	if (!content || typeof content !== 'string') {
		return { valid: false, error: 'Comment is required' };
	}
	
	const trimmed = content.trim();
	if (trimmed.length === 0) {
		return { valid: false, error: 'Comment cannot be empty' };
	}
	
	if (trimmed.length > MAX_COMMENT_LENGTH) {
		return { valid: false, error: `Comment must be ${MAX_COMMENT_LENGTH} characters or less` };
	}
	
	return { valid: true };
}

/**
 * Validate file type and size
 * @param {File} file
 * @param {number} index - File index for error messages
 * @returns {{valid: boolean, error?: string}}
 */
export function validateFile(file, index = 0) {
	if (!file || !(file instanceof File)) {
		return { valid: false, error: 'Invalid file' };
	}
	
	// Check MIME type
	const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
	const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
	
	if (!isImage && !isVideo) {
		return { 
			valid: false, 
			error: `File ${index + 1} has invalid type. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM) are allowed` 
		};
	}
	
	// Check file size
	if (isImage && file.size > MAX_IMAGE_SIZE) {
		return { 
			valid: false, 
			error: `Image ${index + 1} is too large (max ${MAX_IMAGE_SIZE / 1024 / 1024}MB)` 
		};
	}
	
	if (isVideo && file.size > MAX_VIDEO_SIZE) {
		return { 
			valid: false, 
			error: `Video ${index + 1} is too large (max ${MAX_VIDEO_SIZE / 1024 / 1024}MB)` 
		};
	}
	
	return { valid: true };
}

/**
 * Validate file signature (magic numbers) for images
 * @param {Uint8Array} bytes - First few bytes of file
 * @returns {boolean}
 */
export function validateImageSignature(bytes) {
	if (bytes.length < 4) return false;
	
	// JPEG: FF D8 FF
	if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
		return true;
	}
	
	// PNG: 89 50 4E 47
	if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
		return true;
	}
	
	// GIF: 47 49 46 38
	if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
		return true;
	}
	
	// WebP: 52 49 46 46 ... 57 45 42 50
	if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
		// Check for WEBP signature later in the file
		return true;
	}
	
	return false;
}

/**
 * Validate file signature for videos
 * @param {Uint8Array} bytes - First few bytes of file
 * @returns {boolean}
 */
export function validateVideoSignature(bytes) {
	if (bytes.length < 12) return false;
	
	// MP4: Check for ftyp
	const ftypCheck = bytes.length >= 8 && 
		bytes[4] === 0x66 && bytes[5] === 0x74 && 
		bytes[6] === 0x79 && bytes[7] === 0x70;
	
	if (ftypCheck) return true;
	
	// WebM: 1A 45 DF A3
	if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) {
		return true;
	}
	
	// QuickTime: Check for moov/mdat
	const hasQuickTime = bytes.length >= 12 && (
		(bytes[4] === 0x6D && bytes[5] === 0x6F && bytes[6] === 0x6F && bytes[7] === 0x76) ||
		(bytes[4] === 0x6D && bytes[5] === 0x64 && bytes[6] === 0x61 && bytes[7] === 0x74)
	);
	
	if (hasQuickTime) return true;
	
	return false;
}

/**
 * Deeply validate uploaded file
 * @param {File} file
 * @param {number} index
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export async function validateFileDeep(file, index = 0) {
	// First do basic validation
	const basicValidation = validateFile(file, index);
	if (!basicValidation.valid) {
		return basicValidation;
	}
	
	try {
		// Read file header to validate signature
		const arrayBuffer = await file.arrayBuffer();
		const bytes = new Uint8Array(arrayBuffer.slice(0, 12));
		
		const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
		const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
		
		if (isImage && !validateImageSignature(bytes)) {
			return { 
				valid: false, 
				error: `File ${index + 1} appears to be corrupted or is not a valid image` 
			};
		}
		
		if (isVideo && !validateVideoSignature(bytes)) {
			return { 
				valid: false, 
				error: `File ${index + 1} appears to be corrupted or is not a valid video` 
			};
		}
		
		return { valid: true };
	} catch (error) {
		console.error('Error validating file:', error);
		return { valid: false, error: `Failed to validate file ${index + 1}` };
	}
}

/**
 * Validate URL format
 * @param {string} url
 * @returns {{valid: boolean, error?: string}}
 */
export function validateURL(url) {
	if (!url || typeof url !== 'string') {
		return { valid: false, error: 'Invalid URL' };
	}
	
	try {
		const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
		if (!['http:', 'https:'].includes(parsed.protocol)) {
			return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
		}
		return { valid: true };
	} catch {
		return { valid: false, error: 'Invalid URL format' };
	}
}

