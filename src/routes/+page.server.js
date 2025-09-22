
import Airtable from 'airtable';

import dotenv from 'dotenv';
import { json } from '@sveltejs/kit';
import fetch from 'node-fetch';
import crypto from 'crypto';

dotenv.config();


const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const OTP_TABLE = "tblQNYKUKremOTGpD";

const base = new Airtable({ apiKey: AIRTABLE_KEY }).base(AIRTABLE_BASE);


export async function load({ cookies }) {
  const sessionid = cookies.get('sessionid');


  if (!sessionid) return {};

  // fetch user record by sessionid from airtable
  const records = await base('OTP')
    .select({ filterByFormula: `{token} = "${sessionid}"`, maxRecords: 1 })
    .firstPage();

  if (!records.length) return {};

  const user = records[0].fields

  return {
    user
  };
}
