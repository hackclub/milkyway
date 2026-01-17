// src/lib/server/review.js
import { base } from '$lib/server/db.js';

const BLACKHOLE_TABLE = 'BlackholeSubmissions';
const PROJECTS_TABLE = 'Projects';

function mapSubmissionWithProject(rec, projectRec) {
  const f = rec.fields ?? {};
  const pf = projectRec?.fields ?? {};

  let project = null;

  if (projectRec) {
    project = {
      id: projectRec.id,
      name: pf.projectname ?? 'Untitled project',
      description: pf.description ?? '',
      promptinfo: pf.promptinfo ?? '',
      shipURL: pf.shipURL ?? '',
      githubURL: pf.githubURL ?? '',
      projectImage: pf.projectImage ?? '',
      egg: pf.egg ?? '',
      hackatimeHours: pf.hackatimeHours ?? null
    };
  }

  return {
    id: rec.id,
    status: f.Status ?? 'pending',
    username: f.Username ?? null,
    userId: Array.isArray(f.User) ? f.User[0] : null,
    projectId: Array.isArray(f.Project) ? f.Project[0] : null,
    coinsSpent: f.CoinsSpent ?? 0,
    coinsBefore: f.CoinsBefore ?? null,
    coinsAfter: f.CoinsAfter ?? null,
    hackatimeHours: f.HackatimeHoursAtSubmission ?? null,
    stellarshipsAtSubmission: f.StellarshipsAtSubmission ?? null,
    justification: f.Justification ?? '',
    reviewer: f.Reviewer ?? null,
    reason: f.Reason ?? null,
    createdTime: rec._rawJson?.createdTime ?? null,
    project
  };
}

/**
 * Get pending blackhole submissions with attached project info
 * @returns {Promise<any[]>}
 */
export async function getPendingBlackholeReviews() {
  const records = await base(BLACKHOLE_TABLE)
    .select({
      filterByFormula: `{Status} = "pending"`
    })
    .all();

  const results = [];

  for (const rec of records) {
    const f = rec.fields ?? {};
    const projectId = Array.isArray(f.Project) ? f.Project[0] : null;

    let projectRec = null;
    if (projectId) {
      try {
        projectRec = await base(PROJECTS_TABLE).find(projectId);
      } catch (e) {
        console.error('Error fetching project for review', projectId, e);
      }
    }

    results.push(mapSubmissionWithProject(rec, projectRec));
  }

  return results;
}

/**
 * Get a single submission (any status) with project info
 * @param {string} submissionId
 * @returns {Promise<any | null>}
 */
export async function getBlackholeReviewById(submissionId) {
  try {
    const rec = await base(BLACKHOLE_TABLE).find(submissionId);
    const f = rec.fields ?? {};
    const projectId = Array.isArray(f.Project) ? f.Project[0] : null;

    let projectRec = null;
    if (projectId) {
      try {
        projectRec = await base(PROJECTS_TABLE).find(projectId);
      } catch (e) {
        console.error('Error fetching project for review (single)', projectId, e);
      }
    }

    return mapSubmissionWithProject(rec, projectRec);
  } catch (e) {
    console.error('Error fetching submission by ID', submissionId, e);
    return null;
  }
}
