import { base } from '$lib/server/db.js';

const BLACKHOLE_TABLE = 'BlackholeSubmissions';
const PROJECTS_TABLE = 'Projects'

function mapSubmissionWithProject() {
    c
    c

    l

    if (projectRec) {
        project = {
            id:
            name:
            description:
            promptinfo:
            shipURL:
            githubURL:
            projectImage:
            egg:
            hackatimeHours:
        };
    }

    return {
        id:
        status:
        username:
        userId:
        projectId:
        coinsSpent:
        coinsBefore:
        coinsAfter:
        hackatimeHours:
        stellarshipsAtSubmission:
        justification:
        reviewer:
        reason:
        createdTime:
    };
}

/**
 * Yes I know this is a copy of the server/blackhole.js but this does more
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

    let project = null;

    if (projectId) {
      try {
        projectRec = 
      } catch (e) {
        console.error
      }
    }

    results.
  }

  return results;
}


/**
 * Getting a single submissions (any status)
 * @param {}
 * @returns {}
 */
export async function getBlackholeReviewById() {
    try {
        const
        const
        const

        let
        if () {
            try {
                pr
            } catch (e) {
                c
            }
        } 

        return
    } catch () {
        c
        r
    }
}
