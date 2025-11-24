// Backend functions for blackhole to work :)

import { base } from '$lib/server/db.js';
import { z } from 'zod';
import { escapeAirtableFormula } from '$lib/server/security.js';

const USER_TABLE = 'User';
const PROJECTS_TABLE = 'Projects';
const USER_BLACKHOLE_VIEW = 'BlackholeSubmission';
const BLACKHOLE_TABLE = 'BlackholeSubmissions'; // make sure this matches your Airtable table name

// Tongyu change dis based on what you want
const SUBMISSION_COST_COINS = 10;
const MIN_HOURS_REQUIRED = 25;

// zod schemas
export const blackholeSubmitSchema = z.object({
  username: z.string().min(1, 'username is required'),
  projectId: z.string().min(1, 'projectId is required')
});

export const blackholeModerateSchema = z.object({
  submissionId: z.string().min(1, 'submissionId is required'),
  reviewer: z.string().min(1, 'reviewer is required'),
  reason: z.string().optional()
});

// retrieve functions

/**
 * usernames
 * @param {string} username
 * @returns {Promise<any | null>}
 */
async function getUserbyUsername(username) {
  const escaped = escapeAirtableFormula(username);
  const records = await base(USER_TABLE)
    .select({
      view: USER_BLACKHOLE_VIEW,
      filterByFormula: `{username} = "${escaped}"`
    })
    .firstPage();

  return records[0] ?? null;
}

/**
 * projects
 * @param {string} projectId
 * @returns {Promise<any | null>}
 */
async function getProjectById(projectId) {
  try {
    const record = await base(PROJECTS_TABLE).find(projectId);
    return record;
  } catch (e) {
    console.error('Error fetching project by ID:', e);
    return null;
  }
}

/**
 * NO IDENTITY THEFT ALLOWED
 * @param {any} projectRecord
 * @param {any} userRecord}
 */
function assertProjectOwnership(projectRecord, userRecord) {
  const userField = projectRecord.fields.user;

  /** @type {string[]} */
  const projectUserIds = Array.isArray(userField)
    ? userField.map(String)
    : userField
    ? [String(userField)]
    : [];

  const userId = String(userRecord.id);

  if (!projectUserIds.includes(userId)) {
    throw new Error('You do not own this project');
  }
}

/**
 * normalizin
 * @param {any} record
 */
function normalizeSubmission(record) {
  if (!record) return null;
  const f = record.fields ?? {};

  return {
    id: record.id,
    status: f.Status ?? 'pending',
    username: f.Username ?? null,
    userId: Array.isArray(f.User) ? f.User[0] : null,
    projectId: Array.isArray(f.Project) ? f.Project[0] : null,
    coinsSpent: f.CoinsSpent ?? 0,
    coinsBefore: f.CoinsBefore ?? null,
    coinsAfter: f.CoinsAfter ?? null,
    hackatimeHours: f.HackatimeHoursAtSubmission ?? null,
    stellarshipsAtSubmission: f.StellarshipsAtSubmission ?? null,
    reviewer: f.Reviewer ?? null,
    reason: f.Reason ?? null,
    createdTime: record._rawJson?.createdTime ?? null
  };
}

// core flow

/**
 * get the next submissionNumber (max + 1)
 * @returns {Promise<number>}
 */
async function getNextSubmissionNumber() {
  const records = await base(BLACKHOLE_TABLE)
    .select({
      maxRecords: 1,
      sort: [{ field: 'submissionNumber', direction: 'desc' }]
    })
    .firstPage();

  const last = records[0];
  const lastNum = last?.fields?.submissionNumber ?? 0;
  return Number(lastNum) + 1;
}


/**
 * submittin
 * @param {any} rawInput
 * @returns {Promise<any>}
 */
export async function submitToBlackhole(rawInput) {
  const { username, projectId } = blackholeSubmitSchema.parse(rawInput);

  const user = await getUserbyUsername(username);
  if (!user) {
    throw new Error('User not found');
  }

  const coins = Number(user.fields.coins ?? 0);
  const stellarships = Number(user.fields.stellarships ?? 0);

  if (coins < SUBMISSION_COST_COINS) {
    throw new Error(`Not enough coins (requires ${SUBMISSION_COST_COINS})`);
  }

  // project check
  const project = await getProjectById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  // ASSERT DOMINANCE
  assertProjectOwnership(project, user);

  // Hackatime hours
  const hackatimeHours = Number(project.fields.hackatimeHours ?? 0);
  if (hackatimeHours < MIN_HOURS_REQUIRED) {
    throw new Error(
      `Project must have at least ${MIN_HOURS_REQUIRED} hackatimeHours`
    );
  }

  // Coin deduction
  const coinsBefore = coins;
  const coinsAfter = coinsBefore - SUBMISSION_COST_COINS;

  //submission number
  const submissionNumber = await getNextSubmissionNumber();

  // add to blackhole table
  try {
    const created = await base(BLACKHOLE_TABLE).create({
    User: [user.id],
    Username: user.fields.username ?? username,
    Project: [project.id],
    Status: 'pending',
    CoinsSpent: SUBMISSION_COST_COINS,
    CoinsBefore: coinsBefore,
    CoinsAfter: coinsAfter,
    HackatimeHoursAtSubmission: hackatimeHours,
    StellarshipsAtSubmission: stellarships,
    submissionNumber
  });

  await base(USER_TABLE).update(user.id, {
    coins: coinsAfter
  });

  return normalizeSubmission(created);
  } catch (e) {
    console.error('Error creating blackhole submission or updating coins:', e);
    throw e instanceof Error ? e : new Error('Failed to submit to the black hole');
  }
}

/**
 * all submissions for users
 * @param {string} username
 * @returns {Promise<any[]>}
 */
export async function getMyBlackholeSubmissions(username) {
  const escaped = escapeAirtableFormula(username);

  const records = await base(BLACKHOLE_TABLE)
    .select({
      filterByFormula: `{Username} = "${escaped}"`
    })
    .all();

  return records.map(normalizeSubmission);
}

/**
 * Non-pending submissions for users
 * @param {string} username
 * @returns {Promise<any[]>}
 */
export async function getBlackholeHistory(username) {
  const escaped = escapeAirtableFormula(username);

  const records = await base(BLACKHOLE_TABLE)
    .select({
      filterByFormula: `AND({Username} = "${escaped}", {Status} != "pending")`
    })
    .all();

  return records.map(normalizeSubmission);
}

/**
 * All pending submissions
 * @returns {Promise<any[]>}
 */
export async function getPendingBlackholeSubmissions() {
  const records = await base(BLACKHOLE_TABLE)
    .select({
      filterByFormula: `{Status} = "pending"`
    })
    .all();

  return records.map(normalizeSubmission);
}

/**
 * Approving
 * @param {{ submissionId: string, reviewer: string }} input
 * @returns {Promise<any>}
 */
export async function approveBlackholeSubmission(input) {
  const { submissionId, reviewer } = blackholeModerateSchema
    .omit({ reason: true })
    .parse(input);

  const record = await base(BLACKHOLE_TABLE).update(submissionId, {
    Status: 'approved',
    Reviewer: reviewer
  });

  return normalizeSubmission(record);
}

/**
 * Rejecting
 * @param {{ submissionId: string, reviewer: string, reason?: string }} input
 * @returns {Promise<any>}
 */
export async function rejectBlackholeSubmission(input) {
  const { submissionId, reviewer, reason } = blackholeModerateSchema.parse(
    input
  );

  const record = await base(BLACKHOLE_TABLE).update(submissionId, {
    Status: 'rejected',
    Reviewer: reviewer,
    Reason: reason ?? ''
  });

  return normalizeSubmission(record);
}

/**
 * getting all submissions from a user
 * @param {string} userRecId
 * @returns {Promise<any[]>}
 */
export async function getUserSubmissions(userRecId) {
  const escaped = escapeAirtableFormula(userRecId);

  const records = await base(BLACKHOLE_TABLE)
    .select({
      filterByFormula: `FIND("${escaped}", ARRAYJOIN({User}, ","))`
    })
    .all();

  return records.map((r) => normalizeSubmission(r));
}