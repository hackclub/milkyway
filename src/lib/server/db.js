import Airtable from 'airtable';
import dotenv from 'dotenv';
dotenv.config();


const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;

export const base = new Airtable({ apiKey: AIRTABLE_KEY }).base(AIRTABLE_BASE);
