/**
 * Security utility functions
 */

/**
 * Escape special characters for Airtable formula injection prevention
 * @param {string} input - User input to escape
 * @returns {string} - Escaped string safe for Airtable formulas
 */
export function escapeAirtableFormula(input) {
  if (typeof input !== 'string') {
    input = String(input);
  }
  // Escape backslashes first, then quotes
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {boolean} - True if valid username format
 */
export function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  // Alphanumeric, underscores, hyphens, 3-30 characters
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
}

/**
 * Validate OTP format
 * @param {string} otp - OTP to validate
 * @returns {boolean} - True if valid OTP format (6 digits)
 */
export function isValidOTP(otp) {
  if (!otp) return false;
  const otpStr = String(otp);
  return /^\d{6}$/.test(otpStr);
}

/**
 * Sanitize error message for client response
 * @param {Error|string} error - Error object or message
 * @param {string} defaultMessage - Default message to return
 * @returns {string} - Sanitized error message
 */
export function sanitizeErrorMessage(error, defaultMessage = 'An error occurred') {
  // In production, return generic messages
  // In development, return actual error messages
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    return error instanceof Error ? error.message : String(error);
  }
  
  // Return generic message in production unless it's a safe user-facing error
  const safeMessages = [
    'OTP not found',
    'OTP invalid',
    'OTP expired',
    'User not found',
    'Email required',
    'OTP required',
    'Username is required',
    'Project name is required',
    'Unauthorized',
    'Forbidden'
  ];
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  if (safeMessages.includes(errorMessage)) {
    return errorMessage;
  }
  
  return defaultMessage;
}

/**
 * Rate limiting store (in-memory, consider Redis for production)
 */
const rateLimitStore = new Map();

/**
 * Simple rate limiter
 * @param {string} key - Unique key for rate limiting (e.g., IP address or user ID)
 * @param {number} maxRequests - Maximum number of requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - True if request is allowed, false if rate limit exceeded
 */
export function checkRateLimit(key, maxRequests = 5, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };
  
  // Reset if window has passed
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }
  
  // Check if limit exceeded
  if (record.count >= maxRequests) {
    rateLimitStore.set(key, record);
    return false;
  }
  
  // Increment and allow
  record.count++;
  rateLimitStore.set(key, record);
  
  // Cleanup old entries periodically
  if (Math.random() < 0.01) { // 1% chance to cleanup
    cleanupRateLimitStore();
  }
  
  return true;
}

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get real client IP address (handles proxy headers)
 * @param {any} request - SvelteKit request object
 * @returns {string} - Client IP address
 */
export function getRealClientIP(request) {
  // Debug: Log all relevant headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const cfIP = request.headers.get('cf-connecting-ip');
  const realIP = request.headers.get('x-real-ip');
  const trueClientIP = request.headers.get('true-client-ip');
  
  console.log('IP Detection Debug:', {
    'x-forwarded-for': forwardedFor,
    'cf-connecting-ip': cfIP,
    'x-real-ip': realIP,
    'true-client-ip': trueClientIP
  });
  
  // Check proxy headers first (for Cloudflare, Nginx, etc.)
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, the first one is the client
    const clientIP = forwardedFor.split(',')[0].trim();
    console.log('Using X-Forwarded-For:', clientIP);
    return clientIP;
  }
  
  // Check CF-Connecting-IP (Cloudflare)
  if (cfIP) {
    console.log('Using CF-Connecting-IP:', cfIP);
    return cfIP;
  }
  
  // Check True-Client-IP (Cloudflare Enterprise)
  if (trueClientIP) {
    console.log('Using True-Client-IP:', trueClientIP);
    return trueClientIP;
  }
  
  // Check X-Real-IP (Nginx)
  if (realIP) {
    console.log('Using X-Real-IP:', realIP);
    return realIP;
  }
  
  // Fallback to unknown if no headers found
  console.log('No proxy headers found, IP is unknown');
  return 'unknown';
}

/**
 * Get client identifier for rate limiting (IP or session)
 * @param {any} request - SvelteKit request object
 * @param {any} cookies - SvelteKit cookies object
 * @returns {string} - Client identifier
 */
export function getClientIdentifier(request, cookies) {
  // Try to get session ID first (for authenticated users)
  const sessionId = cookies.get('sessionid');
  if (sessionId) {
    return `session:${sessionId}`;
  }
  
  // Fall back to IP address
  const ip = getRealClientIP(request);
  return `ip:${ip}`;
}

