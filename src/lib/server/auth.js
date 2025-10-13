import crypto from 'crypto';
import { json } from '@sveltejs/kit';

import { base } from '$lib/server/db.js'
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
    .select({ filterByFormula: `FIND("${escapedSessionId}", ARRAYJOIN({OTP}, ","))`, maxRecords: 1 })
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
    __serverOnly: true, // Flag to indicate this should not be sent to frontend
  };
}

/**
 * @param {any} serverUser
 * Sanitize user object for safe frontend exposure
 * Removes email and other sensitive fields
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
    // DO NOT include: email, lastHackatimeUpdate, __serverOnly, or other internal fields
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
    throw new Error('OTP not found')
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
    throw new Error('OTP invalid')
  }

  return String(record[0].fields.token); // successful so return token

}




// ------- FUNCTIONS FOR GENERATING OTP AND PASSING STUFF
/**
 * @param {string} email
 */
export async function createOTPRecord(email) {
    const otp = generateOTP();
    const token = generateToken();
    const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry for otp

    // check if user exists
    // if so, create otp & link
    // if not, create a user first!

    var userRecordId = ''

    try {
      console.log("tried to get user")
      userRecordId = await getUserRecordIdByEmail(email)
    }
    catch (error) {
      console.log(error)
      console.log("tried to create user")
      userRecordId = await createUserFromEmail(email);
    }

    console.log("creating OTP record...")
    await base('OTP').create({
      'user': [ userRecordId ],
      'otp': parseInt(otp),
      'token': token,
      'expiry': expiry
    });


    return { otp, token, expiry };
}



/**
 * @param {string} email
 */
async function createUserFromEmail(email) {
  const newUser = await base('User').create({
    'email': email,
  })

  return newUser.id;


}

/**
 * @param {string} email
 */
async function getUserRecordIdByEmail(email) {
  const escapedEmail = escapeAirtableFormula(email);
  const record = await base('User')
  .select({
    filterByFormula: `{email} = "${escapedEmail}"`,
    maxRecords: 1,
  })
  .firstPage();

  if (!record[0]) {
    throw new Error('User does not exist')
  }
  return record[0].id; // return user info
}

/**
 * @param {string} userId
 */
export async function getUserCoinsAndStellarships(userId) {
  const escapedUserId = escapeAirtableFormula(userId);
  const record = await base('User')
    .select({
      filterByFormula: `RECORD_ID() = "${escapedUserId}"`,
      maxRecords: 1,
    })
    .firstPage();

  if (!record[0]) {
    throw new Error('User does not exist')
  }

  const fields = record[0].fields;
  return {
    coins: fields.coins || 0,
    stellarships: fields.stellarships || 0,
    paintchips: fields.paintchips || 0
  };
}



// generate 6-digit otp
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// generate random token
function generateToken() {
  return crypto.randomUUID();
}
