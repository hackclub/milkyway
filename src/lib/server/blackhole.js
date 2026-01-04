// Backend functions for blackhole to work :)

import { base } from '$lib/server/db.js';
import { z } from 'zod';
import { escapeAirtableFormula } from '$lib/server/security.js';

const USER_TABLE = 'User';
const PROJECTS_TABLE = 'Projects';
const USER_BLACKHOLE_VIEW = 'BlackholeSubmission';
const BLACKHOLE_TABLE = 'BlackholeSubmissions';

// Tongyu change dis based on what you want
const SUBMISSION_COST_COINS = 10;

// zod schemas
export const blackholeSubmitSchema = z.object({
  username: z.string().min(1, 'username is required'),
  projectId: z.string().min(1, 'projectId is required'),
  justification: z.string().max(2000).optional()
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
    justification: f.Justification ?? null,
    reviewer: f.Reviewer ?? null,
    reason: f.Reason ?? null,
    justification: f.Justification ?? null,
    claimed: f.Claimed ?? false,
    createdTime: record._rawJson?.createdTime ?? null
  };
}

/**
 * Normalize submission with project info
 * @param {any} record
 * @param {any} projectRecord
 */
function normalizeSubmissionWithProject(record, projectRecord) {
  const submission = normalizeSubmission(record);
  if (!submission) return null;
  
  const pf = projectRecord?.fields ?? {};
  return {
    ...submission,
    projectName: pf.projectname ?? pf.Name ?? 'Unknown Project',
    projectEgg: pf.egg ?? null
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
 * @param {string} userRecordId
 * @param {string} projectRecordId
 * @returns {Promise<boolean>}
 */
async function hasActiveSubmission(userRecordId, projectRecordId) {
  const escapedUser = escapeAirtableFormula(userRecordId);
  const escapedProject = escapeAirtableFormula(projectRecordId);

  const records = await base(BLACKHOLE_TABLE)
    .select({
      filterByFormula: `
        AND(
          FIND("${escapedUser}", ARRAYJOIN({User}, ",")),
          FIND("${escapedProject}", ARRAYJOIN({Project}, ",")),
          OR({Status} = "pending", {Status} = "approved")
        )
      `
    })
    .firstPage();

  return records.length > 0;
}

/**
 * submittin
 * @param {any} rawInput
 * @returns {Promise<any>}
 */
export async function submitToBlackhole(rawInput) {
  const { username, projectId, justification } = blackholeSubmitSchema.parse(rawInput);

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

  //Checking if submitted
  const alreadySubmitted = await hasActiveSubmission(user.id, project.id);
  if (alreadySubmitted) {
    throw new Error(
      'This project already has a pending or approved black hole submission.'
    );
  }


  //Checking if submitted
  const alreadySubmitted = await hasActiveSubmission(user.id, project.id);
  if (alreadySubmitted) {
    throw new Error(
      'This project already has a pending or approved black hole submission.'
    );
  }

  // Hackatime hours (for recording in submission, not a requirement)
  const hackatimeHours = Number(project.fields.hackatimeHours ?? 0);

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
    submissionNumber,
    Justification: justification ?? ''
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

/**
 * Get unclaimed blackhole results (approved or rejected, not yet claimed/dismissed)
 * @param {string} username
 * @returns {Promise<any[]>}
 */
export async function getUnclaimedBlackholeResults(username) {
  const escaped = escapeAirtableFormula(username);

  const records = await base(BLACKHOLE_TABLE)
    .select({
      filterByFormula: `AND(
        {Username} = "${escaped}",
        OR({Status} = "approved", {Status} = "rejected"),
        NOT({Claimed})
      )`
    })
    .all();

  // Get project info for each submission
  const results = await Promise.all(
    records.map(async (record) => {
      const projectId = Array.isArray(record.fields.Project) 
        ? record.fields.Project[0] 
        : null;
      
      let projectRecord = null;
      if (projectId) {
        try {
          projectRecord = await base(PROJECTS_TABLE).find(projectId);
        } catch {
          // Project may have been deleted
        }
      }
      
      return normalizeSubmissionWithProject(record, projectRecord);
    })
  );

  return results.filter(Boolean);
}

/**
 * Claim a stellar ship (for approved submissions)
 * Awards the stellar ship and marks submission as claimed
 * @param {string} submissionId
 * @param {string} username - for verification
 * @returns {Promise<{success: boolean, stellarships?: number}>}
 */
export async function claimStellarShip(submissionId, username) {
  // Get the submission
  const record = await base(BLACKHOLE_TABLE).find(submissionId);
  
  if (!record) {
    throw new Error('Submission not found');
  }
  
  const f = record.fields;
  
  // Verify ownership
  if (f.Username !== username) {
    throw new Error('Not your submission');
  }
  
  // Verify it's approved
  if (f.Status !== 'approved') {
    throw new Error('Submission is not approved');
  }
  
  // Verify not already claimed
  if (f.Claimed) {
    throw new Error('Already claimed');
  }
  
  // Mark submission as claimed
  await base(BLACKHOLE_TABLE).update(submissionId, {
    Claimed: true
  });
  
  // Stellarship count is handled by Airtable formula; nothing to return here
  return { success: true };
}

/**
 * Dismiss a rejected submission (marks it as claimed so it doesn't show again)
 * @param {string} submissionId
 * @param {string} username - for verification
 * @returns {Promise<{success: boolean}>}
 */
export async function dismissBlackholeResult(submissionId, username) {
  // Get the submission
  const record = await base(BLACKHOLE_TABLE).find(submissionId);
  
  if (!record) {
    throw new Error('Submission not found');
  }
  
  const f = record.fields;
  
  // Verify ownership
  if (f.Username !== username) {
    throw new Error('Not your submission');
  }
  
  // Verify it's approved or rejected (not pending)
  if (f.Status === 'pending') {
    throw new Error('Submission is still pending');
  }
  
  // Verify not already claimed
  if (f.Claimed) {
    throw new Error('Already dismissed');
  }
  
  // Mark submission as claimed/dismissed
  await base(BLACKHOLE_TABLE).update(submissionId, {
    Claimed: true
  });
  
  return { success: true };
}

/**
 * Get approved blackhole submissions for a list of project IDs
 * Used to determine which projects have stellar ships
 * @param {string[]} projectIds
 * @returns {Promise<Set<string>>} Set of project IDs that have stellar ships
 */
export async function getProjectsWithStellarShips(projectIds) {
  if (!projectIds || projectIds.length === 0) {
    return new Set();
  }
  
  // Create formula to find approved submissions for these projects
  const projectIdChecks = projectIds.map(id => `FIND("${id}", ARRAYJOIN({Project}, ","))`);
  const formula = `AND({Status} = "approved", OR(${projectIdChecks.join(', ')}))`;
  
  try {
    const records = await base(BLACKHOLE_TABLE)
      .select({
        filterByFormula: formula
      })
      .all();
    
    const stellarShipProjectIds = new Set();
    for (const record of records) {
      const projectId = Array.isArray(record.fields.Project) 
        ? record.fields.Project[0] 
        : null;
      if (projectId) {
        stellarShipProjectIds.add(projectId);
      }
    }
    
    return stellarShipProjectIds;
  } catch (e) {
    console.error('Error fetching stellar ship projects:', e);
    return new Set();
  }
}

/**
 * Get all approved stellar ships with project and user info
 * Only returns public data: projectName, username, and shipURL
 * @returns {Promise<Array<{projectName: string, username: string, shipURL: string}>>}
 */
export async function getAllApprovedStellarShips() {
  try {
    const records = await base(BLACKHOLE_TABLE)
      .select({
        filterByFormula: `{Status} = "approved"`
      })
      .all();
    
    const stellarShips = await Promise.all(
      records.map(async (record) => {
        // Only extract username from submission record (public data)
        const username = String(record.fields.Username || '').trim();
        if (!username) return null;
        
        const projectId = Array.isArray(record.fields.Project) 
          ? record.fields.Project[0] 
          : null;
        
        if (!projectId) return null;
        
        try {
          const projectRecord = await base(PROJECTS_TABLE).find(projectId);
          
          // Only extract public fields: projectName and shipURL
          const projectName = String(projectRecord.fields.projectname || projectRecord.fields.Name || 'Unknown Project').trim();
          const shipURL = String(projectRecord.fields.shipURL || '').trim();
          
          // Only return if it has a shipURL (required for display)
          if (!shipURL) {
            return null;
          }
          
          // Explicitly return only these three public fields
          return {
            projectName,
            username,
            shipURL
          };
        } catch (e) {
          console.error('Error fetching project for stellar ship:', e);
          return null;
        }
      })
    );
    
    // Filter out any null values and return only valid entries
    return stellarShips.filter((ship) => ship !== null && ship !== undefined);
  } catch (e) {
    console.error('Error fetching all approved stellar ships:', e);
    return [];
  }
}