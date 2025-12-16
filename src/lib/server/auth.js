import crypto from 'crypto';

import { base } from '$lib/server/db.js';
import { escapeAirtableFormula } from '$lib/server/security.js';

/**
 * @param {string} sessionid
 */
export async function getUserRecordBySessionId(sessionid) {
	const escapedSessionId = escapeAirtableFormula(sessionid);
	const records = await base('OTP')
		.select({ filterByFormula: `{token} = "${escapedSessionId}"`, maxRecords: 1 })
		.firstPage();

	if (!records.length) return null;
	const user = records[0].fields;
	return { user };
}

/**
 * @param {string} sessionid
 * Get FULL user info by session ID - SERVER SIDE ONLY
 * This returns ALL fields including email for server-side operations
 * NEVER pass this directly to the frontend
 */
export async function getUserInfoBySessionId(sessionid) {
	const escapedSessionId = escapeAirtableFormula(sessionid);
	const records = await base('User')
		.select({
			filterByFormula: `FIND("${escapedSessionId}", ARRAYJOIN({OTP}, ","))`,
			maxRecords: 1
		})
		.firstPage();

	if (!records.length) return null;
	const fields = records[0].fields;

	// Return full user object with email for server-side use
	// Mark with __serverOnly flag as a reminder not to expose to frontend
	return {
		recId: records[0].id,
		email: fields.email, // SERVER SIDE ONLY - do not pass to frontend
		username: fields.username,
		hasOnboarded: fields.hasOnboarded,
		coins: fields.coins,
		stellarships: fields.stellarships,
		paintchips: fields.paintchips,
		lastHackatimeUpdate: fields.lastHackatimeUpdate,
		githubUsername: fields.githubUsername,
		birthday: fields.birthday,
		howDidYouHear: fields.howDidYouHear,
		doingWell: fields.doingWell,
		improve: fields.improve,
		address: fields.address,
		idv: fields.idv,
		devlogStreak: fields.devlogStreak || 0,
		maxDevlogStreak: fields.maxDevlogStreak || 0,
		wallVariant: fields.wallVariant || 'default',
		lastDevlogDate: fields.lastDevlogDate || null,
		// Hack Club Auth fields
		hackclub_id: fields.hackclub_id || null,
		hackclub_name: fields.hackclub_name || null,
		hackclub_slack_id: fields.hackclub_slack_id || null,
		hackclub_email: fields.hackclub_email || null,
		hackclub_address: fields.hackclub_address || null, // SERVER SIDE ONLY - never expose to frontend
		hackclub_birthday: fields.hackclub_birthday || null, // SERVER SIDE ONLY - never expose to frontend
		hackclub_verification_status: fields.hackclub_verification_status || null,
		__serverOnly: true // Flag to indicate this should not be sent to frontend
	};
}

/**
 * @param {any} serverUser
 * Sanitize user object for safe frontend exposure
 * Removes email, address, and other sensitive fields
 * SECURITY: This is used for the current user's own data
 */
export function sanitizeUserForFrontend(serverUser) {
	if (!serverUser) return null;

	return {
		recId: serverUser.recId,
		username: serverUser.username,
		hasOnboarded: serverUser.hasOnboarded,
		coins: serverUser.coins || 0,
		stellarships: serverUser.stellarships || 0,
		paintchips: serverUser.paintchips || 0,
		githubUsername: serverUser.githubUsername || '',
		birthday: serverUser.birthday || '',
		howDidYouHear: serverUser.howDidYouHear || '',
		doingWell: serverUser.doingWell || '',
		improve: serverUser.improve || '',
		devlogStreak: serverUser.devlogStreak || 0,
		maxDevlogStreak: serverUser.maxDevlogStreak || 0,
		wallVariant: serverUser.wallVariant || 'default',
		// Hack Club Auth - only include non-sensitive fields
		hackclub_id: serverUser.hackclub_id || null,
		hackclub_name: serverUser.hackclub_name || null,
		hackclub_slack_id: serverUser.hackclub_slack_id || null
		// DO NOT include: email, address, idv, lastHackatimeUpdate, lastDevlogDate, hackclub_address, hackclub_birthday, __serverOnly, or other internal fields
	};
}

/**
 * @param {any} serverUser
 * Sanitize user object for public display (other users viewing this user)
 * SECURITY: Exposes minimal information - only username and public stats
 */
export function sanitizeUserForPublic(serverUser) {
	if (!serverUser) return null;

	return {
		recId: serverUser.recId,
		username: serverUser.username,
		githubUsername: serverUser.githubUsername || '',
		devlogStreak: serverUser.devlogStreak || 0,
		maxDevlogStreak: serverUser.maxDevlogStreak || 0,
		wallVariant: serverUser.wallVariant || 'default'
		// DO NOT include: email, address, idv, coins, stellarships, paintchips, birthday, or other personal/sensitive fields
	};
}

// ------- VERIFY OTP
/**
 * @param {string} email
 * @param {string} otp
 */
export async function verifyOTPAndCreateSession(email, otp) {
	const escapedEmail = escapeAirtableFormula(email);
	const record = await base('OTP')
		.select({
			filterByFormula: `{email} = "${escapedEmail}"`,
			maxRecords: 1,
			sort: [{ field: 'Created', direction: 'desc' }]
		})
		.firstPage();

	if (!record[0]) {
		throw new Error('OTP not found');
	}

	// Check if OTP has expired
	const expiryField = record[0].fields.expiry;
	const expiryTime = new Date(String(expiryField));
	const now = new Date();
	if (now > expiryTime) {
		throw new Error('OTP expired');
	}

	// Use strict equality and parse OTP as integer
	const storedOTP = parseInt(String(record[0].fields.otp), 10);
	const providedOTP = parseInt(otp, 10);

	if (storedOTP !== providedOTP || isNaN(storedOTP) || isNaN(providedOTP)) {
		throw new Error('OTP invalid');
	}

	return String(record[0].fields.token); // successful so return token
}

// ------- FUNCTIONS FOR GENERATING OTP AND PASSING STUFF
/**
 * @param {string} email
 * @param {string | null} referrer
 * @param {string | null} ipAddress
 * @param {string | null} utmSource
 */
export async function createOTPRecord(email, referrer = null, ipAddress = null, utmSource = null) {
	const otp = generateOTP();
	const token = generateToken();
	const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry for otp

	// check if user exists
	// if so, create otp & link
	// if not, create a user first!

	var userRecordId = '';

	try {
		console.log('tried to get user');
		userRecordId = await getUserRecordIdByEmail(email);
	} catch (error) {
		console.log(error);
		console.log('tried to create user');
		userRecordId = await createUserFromEmail(email, referrer, utmSource);
	}

	console.log('creating OTP record...');
	await base('OTP').create({
		user: [userRecordId],
		otp: parseInt(otp),
		token: token,
		expiry: expiry,
		ipAddress: ipAddress
	});

	return { otp, token, expiry };
}

/**
 * @param {string} email
 * @param {string | null} referrer
 * @param {string | null} utmSource
 */
async function createUserFromEmail(email, referrer = null, utmSource = null) {
	// If referrer is provided, find the referrer's record ID
	let referrerRecordId = null;
	if (referrer) {
		try {
			referrerRecordId = await getUserRecordIdByUsername(referrer);
		} catch (error) {
			console.log(`Referrer ${referrer} not found:`, error);
			// Continue without referrer if not found
		}
	}

	const userData = /** @type {any} */ ({
		email: email
	});

	// Add referrer if found
	if (referrerRecordId) {
		userData['referrer'] = [referrerRecordId];
	}

	// Add utm_source if provided
	if (utmSource) {
		userData['utm_source'] = utmSource;
	}

	const newUser = await base('User').create(userData);

	return /** @type {any} */ (newUser).id;
}

/**
 * @param {string} email
 */
async function getUserRecordIdByEmail(email) {
	const escapedEmail = escapeAirtableFormula(email);
	const record = await base('User')
		.select({
			filterByFormula: `{email} = "${escapedEmail}"`,
			maxRecords: 1
		})
		.firstPage();

	if (!record[0]) {
		throw new Error('User does not exist');
	}
	return record[0].id; // return user info
}

/**
 * @param {string} userRecId
 * Update the lastLogin field for a user by their record ID
 */
export async function updateUserLastLogin(userRecId) {
	try {
		// Update the lastLogin field with current timestamp
		await base('User').update(userRecId, {
			lastLogin: new Date().toISOString()
		});
	} catch (error) {
		console.error('Failed to update lastLogin:', error);
		// Don't throw - page should load even if lastLogin update fails
	}
}

/**
 * @param {string} username
 */
async function getUserRecordIdByUsername(username) {
	const escapedUsername = escapeAirtableFormula(username);
	const record = await base('User')
		.select({
			filterByFormula: `{username} = "${escapedUsername}"`,
			maxRecords: 1
		})
		.firstPage();

	if (!record[0]) {
		throw new Error('User does not exist');
	}
	return record[0].id; // return user record ID
}

/**
 * @param {string} username
 * Get user info by username
 * WARNING: Returns email field for server-side use ONLY
 * NEVER send the returned object directly to the client without removing email!
 */
export async function getUserInfoByUsername(username) {
	const escapedUsername = escapeAirtableFormula(username);
	const records = await base('User')
		.select({
			filterByFormula: `{username} = "${escapedUsername}"`,
			maxRecords: 1
		})
		.firstPage();

	if (!records.length) return null;
	const fields = records[0].fields;

	return {
		recId: records[0].id,
		email: fields.email,
		username: fields.username,
		hasOnboarded: fields.hasOnboarded,
		coins: fields.coins,
		stellarships: fields.stellarships,
		paintchips: fields.paintchips,
		githubUsername: fields.githubUsername,
		birthday: fields.birthday,
		wallVariant: fields.wallVariant || 'default'
	};
}

/**
 * @param {string} userId
 */
export async function getUserCoinsAndStellarships(userId) {
	const escapedUserId = escapeAirtableFormula(userId);
	const record = await base('User')
		.select({
			filterByFormula: `RECORD_ID() = "${escapedUserId}"`,
			maxRecords: 1
		})
		.firstPage();

	if (!record[0]) {
		throw new Error('User does not exist');
	}

	const fields = record[0].fields;
	return {
		coins: fields.coins || 0,
		stellarships: fields.stellarships || 0,
		paintchips: fields.paintchips || 0
	};
}

/**
 * @param {string} email
 * Get count of users who were referred by this user
 */
export async function getReferralCountByEmail(email) {
	const records = await base('User')
		.select({
			filterByFormula: `FIND("${email}", ARRAYJOIN({referrer}, ","))`
		})
		.all();

	return records.length;
}

// generate 6-digit otp
function generateOTP() {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

// generate random token
function generateToken() {
	return crypto.randomUUID();
}
