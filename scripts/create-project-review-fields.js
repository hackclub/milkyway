/**
 * Create missing Airtable fields for project review dashboards.
 *
 * This script is SAFE to re-run:
 * - It reads current schema first
 * - It only creates fields that do not already exist
 * - It does not modify or delete existing fields
 *
 * Usage:
 *   AIRTABLE_PAT=pat_xxx AIRTABLE_BASE_ID=app_xxx node scripts/create-project-review-fields.js
 *
 * Required PAT scopes:
 * - schema.bases:read
 * - schema.bases:write
 */

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_NAME = 'YSWS Project Submission';
const USER_TABLE_NAME = 'User';

if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
	throw new Error('Missing required env vars: AIRTABLE_PAT and AIRTABLE_BASE_ID');
}

/**
 * @param {string} url
 * @param {RequestInit} [options]
 */
async function requestJson(url, options = {}) {
	const response = await fetch(url, {
		...options,
		headers: {
			Authorization: `Bearer ${AIRTABLE_PAT}`,
			'Content-Type': 'application/json',
			...(options.headers || {})
		}
	});

	const text = await response.text();
	let parsed = {};
	try {
		parsed = text ? JSON.parse(text) : {};
	} catch {
		parsed = { raw: text };
	}

	if (!response.ok) {
		throw new Error(
			`Airtable API error ${response.status} ${response.statusText}: ${JSON.stringify(parsed)}`
		);
	}

	return parsed;
}

/**
 * @param {string} userTableId
 */
function desiredFields(userTableId) {
	return [
		{
			name: 'projectReviewer1',
			type: 'multipleRecordLinks',
			options: {
				linkedTableId: userTableId
			}
		},
		{
			name: 'projectReviewer2',
			type: 'multipleRecordLinks',
			options: {
				linkedTableId: userTableId
			}
		},
		{ name: 'projectReview1EstimatedHoursFeel', type: 'multilineText' },
		{ name: 'projectReview1Coins', type: 'number', options: { precision: 0 } },
		{ name: 'projectReview1Feedback', type: 'multilineText' },
		{
			name: 'projectReview1Suspicious',
			type: 'checkbox',
			options: { icon: 'check', color: 'redBright' }
		},
		{
			name: 'projectReview1SubmittedAt',
			type: 'dateTime',
			options: {
				dateFormat: { name: 'iso' },
				timeFormat: { name: '24hour' },
				timeZone: 'utc'
			}
		},
		{ name: 'projectReview2EstimatedHoursFeel', type: 'multilineText' },
		{ name: 'projectReview2Coins', type: 'number', options: { precision: 0 } },
		{ name: 'projectReview2Feedback', type: 'multilineText' },
		{
			name: 'projectReview2Suspicious',
			type: 'checkbox',
			options: { icon: 'check', color: 'redBright' }
		},
		{
			name: 'projectReview2SubmittedAt',
			type: 'dateTime',
			options: {
				dateFormat: { name: 'iso' },
				timeFormat: { name: '24hour' },
				timeZone: 'utc'
			}
		},
		{
			name: 'projectAdminReviewer',
			type: 'multipleRecordLinks',
			options: {
				linkedTableId: userTableId
			}
		},
		{
			name: 'projectAdminSubmittedAt',
			type: 'dateTime',
			options: {
				dateFormat: { name: 'iso' },
				timeFormat: { name: '24hour' },
				timeZone: 'utc'
			}
		}
	];
}

async function main() {
	const schema = await requestJson(
		`https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`
	);

	const tables = Array.isArray(schema.tables) ? schema.tables : [];
	const yswsTable = tables.find((table) => table.name === TABLE_NAME);
	const userTable = tables.find((table) => table.name === USER_TABLE_NAME);

	if (!yswsTable) {
		throw new Error(`Table not found: "${TABLE_NAME}"`);
	}
	if (!userTable) {
		throw new Error(`Table not found: "${USER_TABLE_NAME}"`);
	}

	const existing = new Set((yswsTable.fields || []).map((field) => field.name));
	const needed = desiredFields(userTable.id).filter((field) => !existing.has(field.name));

	if (needed.length === 0) {
		console.log('All project review fields already exist. Nothing to create.');
		return;
	}

	console.log(`Creating ${needed.length} missing fields on "${TABLE_NAME}"...`);
	for (const field of needed) {
		await requestJson(
			`https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables/${yswsTable.id}/fields`,
			{
				method: 'POST',
				body: JSON.stringify(field)
			}
		);
		console.log(`+ Created: ${field.name}`);
	}

	console.log('Done.');
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
