import crypto from 'crypto';
import { json } from '@sveltejs/kit';

import { base } from '$lib/server/db.js'


export async function getUserRecordBySessionId(sessionid) {
  const records = await base('OTP')
  .select({ filterByFormula: `{token} = "${sessionid}"`, maxRecords: 1 })
  .firstPage();

  if (!records.length) return null;
  const user = records[0].fields;
  return { user };
}

export async function getUserInfoBySessionId(sessionid) {

  const records = await base('User')
    .select({ filterByFormula: `FIND("${sessionid}", ARRAYJOIN({OTP}, ","))`, maxRecords: 1 })
    .firstPage();

  if (!records.length) return null;
  const user = records[0].fields;
  return user;
}

// ------- VERIFY OTP
export async function verifyOTPAndCreateSession(email, otp) {
  const record = await base('OTP')
  .select({
    filterByFormula: `{email} = "${email}"`,
    maxRecords: 1,
    sort: [{ field: 'Created', direction: 'desc' }]
  })
  .firstPage();

  console.log("actual otp is ", record[0].fields.otp)

  if (!record[0]) {
    throw new Error('OTP not found')
  }


  if (record[0].fields.otp != otp) {
    throw new Error('OTP invalid')
  }

  return record[0].fields.token; // successful so return token

}




// ------- FUNCTIONS FOR GENERATING OTP AND PASSING STUFF
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
    console.log(userRecordId)
    await base('OTP').create({
      'user': [ userRecordId ],
      'otp': parseInt(otp),
      'token': token,
      'expiry': expiry
    });


    return { otp, token, expiry };
}



async function createUserFromEmail(email) {
  const newUser = await base('User').create({
    'email': email,
  })

  return newUser.id;


}

async function getUserRecordIdByEmail(email) {
  const record = await base('User')
  .select({
    filterByFormula: `{email} = "${email}"`,
    maxRecords: 1,
  })
  .firstPage();

  if (!record[0]) {
    throw new Error('User does not exist')
  }
  console.log(record[0])
  return record[0].id; // return user info
}



// generate 6-digit otp
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// generate random token
function generateToken() {
  return crypto.randomUUID();
}
