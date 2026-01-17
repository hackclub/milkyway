console.log('@@ reviewer.js loaded @@');

import { base } from '$lib/server/db.js';
import { escapeAirtableFormula } from '$lib/server/security.js';

const USER_TABLE = 'User';
const USER_INFO_VIEW = 'User Info';

const PROJECTS_TABLE = 'Projects';
// const PROJECTS_GRID_VIEW = 'Grid view'; 

const YSWS_TABLE = 'YSWS Project Submission';

const BLACKHOLE_TABLE = 'BlackholeSubmissions';
const BLACKHOLE_PENDING_VIEW = 'Pending only';

// Project
const FIELD_STATUS = 'status';
const FIELD_WAITING_REVIEW = 'waitingReview'; 
const FIELD_HOURS = 'hoursShipped';

const FIELD_VOTE_CRAZY = 'Crazygood';
const FIELD_VOTE_GOOD = 'good';
const FIELD_VOTE_UNSURE = 'unsure';
const FIELD_VOTE_NOTHOURS = 'nothours';

const FIELD_BASIC_REVIEWERS = 'reviewedBy'; 
const FIELD_YSWS_LINK = 'YSWS Project Submission';

const FIELD_COINS_AWARDED = 'coinsAwarded';
const FIELD_AWARDING_RESULTS = 'awardingResults';

// Blackhole 
const BH_FIELD_STATUS = 'Status';
const BH_FIELD_REVIEWED_BY = 'ReviewedBy';

// once i add justification field DO SOON
const BH_FIELD_DECISION = null;

/**
 * Reviewer perms 
 * @param {string} userRecId
 * @returns {Promise<string[]>}
 */
export async function getReviewerPermissions(userRecId) {
  const escaped = escapeAirtableFormula(userRecId);

  const records = await base(USER_TABLE)
    .select({
      view: USER_INFO_VIEW,
      filterByFormula: `RECORD_ID() = "${escaped}"`
    })
    .firstPage();

  const rec = records[0];
  const perms = rec?.fields?.permissions;

  return Array.isArray(perms) ? perms.map(String) : [];
}

/**
 * Basic reviewer queue
 * @returns {Promise<any[]>}
 */
export async function getBasicReviewQueue() {
  console.log('@@ getBasicReviewQueue CALLED @@');

  const formula = `AND(
    {${FIELD_STATUS}} = "submitted",
    OR(
      LEN(TRIM({${FIELD_WAITING_REVIEW}} & "")) = 0,
      REGEX_MATCH(LOWER(TRIM({${FIELD_WAITING_REVIEW}} & "")), "^waiting")
    )
  )`;

  console.log('[basic queue] formula:', formula);

  const records = await base(PROJECTS_TABLE)
    .select({
      filterByFormula: formula
    })
    .all();

  console.log('[basic queue] records found:', records.length);

  // just in case queue dies on me again
  if (records.length === 0) {
    const sample = await base(PROJECTS_TABLE).select({ maxRecords: 8 }).firstPage();
    console.log(
      '[basic queue] sample project fields:',
      sample.map((r) => ({
        id: r.id,
        status: r.fields?.[FIELD_STATUS],
        waitingReview: r.fields?.[FIELD_WAITING_REVIEW]
      }))
    );
  }

  return records.map(normalizeProjectForReview);
}

/**
 * Second reviewer queue:
 * @returns {Promise<any[]>}
 */
export async function getSecondReviewQueue() {
  const formula = `AND(
    {${FIELD_STATUS}} = "second",
    OR(
      LEN(TRIM({${FIELD_WAITING_REVIEW}} & "")) = 0,
      REGEX_MATCH(LOWER(TRIM({${FIELD_WAITING_REVIEW}} & "")), "^waiting")
    )
  )`;

  const records = await base(PROJECTS_TABLE)
    .select({
      filterByFormula: formula
    })
    .all();

  return records.map(normalizeProjectForReview);
}

/**
 * Fetch one project for review by Airtable record id
 * @param {string} projectId
 * @returns {Promise<any|null>}
 */
export async function getProjectForReviewById(projectId) {
  try {
    const rec = await base(PROJECTS_TABLE).find(projectId);
    return normalizeProjectForReview(rec);
  } catch (e) {
    console.error('getProjectForReviewById error', e);
    return null;
  }
}

/**
 * Blackhole pending
 * @returns {Promise<any[]>}
 */
export async function getBlackholePendingQueue() {
  const records = await base(BLACKHOLE_TABLE).select({ view: BLACKHOLE_PENDING_VIEW }).all();
  return records.map(normalizeBlackholeSubmission);
}

/**
 * Fetch one blackhole submission by id
 * @param {string} submissionId
 * @returns {Promise<any|null>}
 */
export async function getBlackholeSubmissionById(submissionId) {
  try {
    const rec = await base(BLACKHOLE_TABLE).find(submissionId);
    return normalizeBlackholeSubmission(rec);
  } catch (e) {
    console.error('getBlackholeSubmissionById error', e);
    return null;
  }
}

/**
 * Basic
 */
export async function submitBasicVote({ projectId, reviewerId, vote }) {
  if (!projectId || !reviewerId || !vote) {
    throw new Error('Missing projectId, reviewerId, or vote');
  }

  /** @type {Record<string,string>} */
  const voteFieldMap = {
    crazygood: FIELD_VOTE_CRAZY,
    good: FIELD_VOTE_GOOD,
    unsure: FIELD_VOTE_UNSURE,
    nothours: FIELD_VOTE_NOTHOURS
  };

  const voteField = voteFieldMap[vote];
  if (!voteField) throw new Error(`Invalid vote: ${vote}`);

  const projectRec = await base(PROJECTS_TABLE).find(projectId);
  const f = projectRec.fields ?? {};

  const status = String(f[FIELD_STATUS] ?? '');
  const waitingReview = f[FIELD_WAITING_REVIEW];
  const waitingOk = isWaitingReviewAllowed(waitingReview);

  if (status !== 'submitted' || !waitingOk) {
    throw new Error(`Project not reviewable. status=${status}, waitingOk=${waitingOk}`);
  }

  const existingReviewers = Array.isArray(f[FIELD_BASIC_REVIEWERS]) ? f[FIELD_BASIC_REVIEWERS] : [];
  if (existingReviewers.includes(reviewerId)) {
    throw new Error('Reviewer already voted on this project');
  }

  const curCrazy = toNum(f[FIELD_VOTE_CRAZY]);
  const curGood = toNum(f[FIELD_VOTE_GOOD]);
  const curUnsure = toNum(f[FIELD_VOTE_UNSURE]);
  const curNotHours = toNum(f[FIELD_VOTE_NOTHOURS]);

  /** @type {{crazygood:number, good:number, unsure:number, nothours:number}} */
  const next = { crazygood: curCrazy, good: curGood, unsure: curUnsure, nothours: curNotHours };
  next[vote] += 1;

  let newStatus = status;
  /** @type {null | 10 | 9} */
  let coinsPerHour = null;

  if (next.unsure >= 2 || next.nothours >= 2) {
    newStatus = 'second';
  } else if (next.crazygood >= 2) {
    coinsPerHour = 10;
  } else if (next.crazygood + next.good >= 2) {
    coinsPerHour = 9;
  }

  // Only require YSWS link if awarding
  let yswsSubmissionId = null;
  if (coinsPerHour !== null) {
    const yswsLinked = Array.isArray(f[FIELD_YSWS_LINK]) ? f[FIELD_YSWS_LINK] : [];
    if (yswsLinked.length === 0) {
      throw new Error('No linked YSWS Project Submission record on this Project.');
    }
    yswsSubmissionId = yswsLinked[0];
  }

  /** @type {Record<string, any>} */
  const updateFields = {
    [FIELD_VOTE_CRAZY]: next.crazygood,
    [FIELD_VOTE_GOOD]: next.good,
    [FIELD_VOTE_UNSURE]: next.unsure,
    [FIELD_VOTE_NOTHOURS]: next.nothours,
    [FIELD_BASIC_REVIEWERS]: [...existingReviewers, reviewerId]
  };

  if (newStatus !== status) updateFields[FIELD_STATUS] = newStatus;

  await base(PROJECTS_TABLE).update(projectId, updateFields);

  let awardResult = null;
  if (coinsPerHour !== null && yswsSubmissionId) {
    const hours = toNum(f[FIELD_HOURS]);
    const coinsAwarded = hours * coinsPerHour;

    await base(YSWS_TABLE).update(yswsSubmissionId, {
      [FIELD_COINS_AWARDED]: coinsAwarded,
      [FIELD_AWARDING_RESULTS]: `basic_awarded_${coinsPerHour}_cph`
    });

    awardResult = { submissionId: yswsSubmissionId, coinsAwarded, coinsPerHour };
  }

  return { ok: true, projectId, nextCounts: next, newStatus, awardResult };
}

/**
 * Blackhole review
 */
export async function submitBlackholeDecision({ submissionId, reviewerId, decision }) {
  if (!submissionId || !reviewerId || !decision) {
    throw new Error('Missing submissionId, reviewerId, or decision');
  }
  if (decision !== 'approve' && decision !== 'reject') {
    throw new Error('Decision must be "approve" or "reject"');
  }

  const rec = await base(BLACKHOLE_TABLE).find(submissionId);
  const f = rec.fields ?? {};

  const already = Array.isArray(f[BH_FIELD_REVIEWED_BY]) ? f[BH_FIELD_REVIEWED_BY] : [];
  if (already.includes(reviewerId)) {
    throw new Error('You already reviewed this blackhole submission');
  }

  const nextReviewedBy = [...already, reviewerId];
  const nextStatus = decision === 'approve' ? 'approved' : 'rejected';

  /** @type {Record<string, any>} */
  const updateFields = {
    [BH_FIELD_STATUS]: nextStatus,
    [BH_FIELD_REVIEWED_BY]: nextReviewedBy
  };

  if (BH_FIELD_DECISION) updateFields[BH_FIELD_DECISION] = decision;

  await base(BLACKHOLE_TABLE).update(submissionId, updateFields);

  return { ok: true, submissionId, status: nextStatus };
}

/**
 * Second review 
 */
export async function submitSecondDecision({ projectId, reviewerId, action }) {
  if (!projectId || !reviewerId || !action) {
    throw new Error('Missing projectId, reviewerId, or action');
  }
  if (!['award10', 'award9', 'backToWip'].includes(action)) {
    throw new Error('Invalid action');
  }

  const projectRec = await base(PROJECTS_TABLE).find(projectId);
  const f = projectRec.fields ?? {};

  const status = String(f[FIELD_STATUS] ?? '');
  const waitingReview = f[FIELD_WAITING_REVIEW];
  const waitingOk = isWaitingReviewAllowed(waitingReview);

  if (status !== 'second' || !waitingOk) {
    throw new Error(`Project not reviewable for second. status=${status}, waitingOk=${waitingOk}`);
  }

  const reviewedBy = Array.isArray(f[FIELD_BASIC_REVIEWERS]) ? f[FIELD_BASIC_REVIEWERS] : [];
  if (reviewedBy.includes(reviewerId)) {
    throw new Error('You already reviewed this project');
  }

  // mark reviewed
  await base(PROJECTS_TABLE).update(projectId, {
    [FIELD_BASIC_REVIEWERS]: [...reviewedBy, reviewerId]
  });

  if (action === 'backToWip') {
    await base(PROJECTS_TABLE).update(projectId, { [FIELD_STATUS]: 'wip' });
    return { ok: true, projectId, newStatus: 'wip' };
  }

  const yswsLinked = Array.isArray(f[FIELD_YSWS_LINK]) ? f[FIELD_YSWS_LINK] : [];
  if (yswsLinked.length === 0) {
    throw new Error('No linked YSWS Project Submission record on this Project.');
  }
  const yswsSubmissionId = yswsLinked[0];

  const coinsPerHour = action === 'award10' ? 10 : 9;
  const hours = toNum(f[FIELD_HOURS]);
  const coinsAwarded = hours * coinsPerHour;

  await base(YSWS_TABLE).update(yswsSubmissionId, {
    [FIELD_COINS_AWARDED]: coinsAwarded,
    [FIELD_AWARDING_RESULTS]: `second_awarded_${coinsPerHour}_cph`
  });

  return { ok: true, projectId, awardResult: { submissionId: yswsSubmissionId, coinsAwarded, coinsPerHour } };
}

function pickField(f, keys, fallback = '') {
  for (const k of keys) {
    const v = f?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return fallback;
}

/**
 * Normalizing Projects
 * @param {any} rec
 */
function normalizeProjectForReview(rec) {
  const f = rec?.fields ?? {};

  return {
    id: rec.id,

    projectname: pickField(f, ['projectname', 'Project Name', 'Project', 'Name'], 'Untitled project'),
    username: pickField(f, ['username', 'Username', 'userName', 'User'], ''),

    description: pickField(f, ['description', 'Description', 'desc'], ''),
    howToPlay: pickField(f, ['howToPlay', 'How to Play', 'How To Play', 'how to play'], ''),
    addnComments: pickField(f, ['addnComments', 'Additional Comments', 'Addn Comments', 'additionalComments'], ''),
    notMadeBy: pickField(f, ['notMadeBy', 'Not made by', 'Not Made By'], ''),

    image: f.image ?? f.Image ?? null,
    githubURL: pickField(f, ['githubURL', 'GitHub', 'Github', 'github'], ''),
    shipURL: pickField(f, ['shipURL', 'Ship URL', 'ship', 'Ship'], ''),

    artHoursShipped: f.artHoursShipped ?? f['art hours shipped'] ?? null,
    hoursShipped: f.hoursShipped ?? f['hours shipped'] ?? null,
    hackatimeProjects: f.hackatimeProjects ?? f['Hackatime Projects'] ?? [],

    status: f[FIELD_STATUS] ?? '',
    waitingReview: f[FIELD_WAITING_REVIEW] ?? '',

    Crazygood: f[FIELD_VOTE_CRAZY] ?? 0,
    good: f[FIELD_VOTE_GOOD] ?? 0,
    unsure: f[FIELD_VOTE_UNSURE] ?? 0,
    nothours: f[FIELD_VOTE_NOTHOURS] ?? 0,

    reviewedBy: f[FIELD_BASIC_REVIEWERS] ?? []
  };
}

/**
 * Normalize Blackhole
 * @param {any} rec
 */
function normalizeBlackholeSubmission(rec) {
  const f = rec?.fields ?? {};
  return {
    id: rec.id,
    status: f[BH_FIELD_STATUS] ?? 'pending',
    Username: f.Username ?? '',
    Justification: f.Justification ?? '',
    Screenshots: f.Screenshots ?? null,
    User: Array.isArray(f.User) ? f.User[0] : null,
    Project: Array.isArray(f.Project) ? f.Project[0] : null,
    shipURL: f.shipURL ?? '',
    ReviewedBy: f[BH_FIELD_REVIEWED_BY] ?? []
  };
}

function toNum(x) {
  const n = typeof x === 'number' ? x : Number(x ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * waitingReview check
 */
function isWaitingReviewAllowed(waitingReview) {
  if (waitingReview === undefined || waitingReview === null) return true;
// i swear if its an array
  if (Array.isArray(waitingReview)) {
    if (waitingReview.length === 0) return true;
    waitingReview = waitingReview.join(', ');
  }

  const s = String(waitingReview).trim();
  if (s.length === 0) return true;
  return s.toLowerCase().startsWith('waiting');
}

function isWaitingReviewEmpty(waitingReview) {
  return isWaitingReviewAllowed(waitingReview) && String(waitingReview ?? '').trim().length === 0;
}
