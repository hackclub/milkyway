/**
 * Sanitization utilities for user-generated content
 */
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content - allows basic formatting
 * @param {string} dirty - Potentially unsafe HTML
 * @returns {string} - Sanitized HTML safe for display
 */
export function sanitizeHTML(dirty) {
	if (!dirty || typeof dirty !== 'string') return '';
	
	return DOMPurify.sanitize(dirty, {
		ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
		ALLOWED_ATTR: [],
		KEEP_CONTENT: true
	});
}

/**
 * Sanitize plain text - escapes all HTML entities
 * @param {string} text - Potentially unsafe text
 * @returns {string} - Safe text with escaped HTML entities
 */
export function sanitizeText(text) {
	if (!text || typeof text !== 'string') return '';
	
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

/**
 * Sanitize filename - remove potentially dangerous characters
 * @param {string} filename - Original filename
 * @returns {string} - Safe filename
 */
export function sanitizeFilename(filename) {
	if (!filename || typeof filename !== 'string') return 'file';
	
	// Remove path traversal attempts and special characters
	return filename
		.replace(/\.\./g, '')
		.replace(/[\/\\:*?"<>|]/g, '')
		.replace(/[^\w\s.-]/g, '')
		.trim()
		.substring(0, 255) || 'file';
}

/**
 * Validate and sanitize URL
 * @param {string} url - URL to validate
 * @returns {string|null} - Valid URL or null
 */
export function sanitizeURL(url) {
	if (!url || typeof url !== 'string') return null;
	
	try {
		const parsed = new URL(url);
		// Only allow http and https protocols
		if (!['http:', 'https:'].includes(parsed.protocol)) {
			return null;
		}
		return parsed.toString();
	} catch {
		// Try adding https:// if missing
		try {
			const parsed = new URL(`https://${url}`);
			return parsed.toString();
		} catch {
			return null;
		}
	}
}

