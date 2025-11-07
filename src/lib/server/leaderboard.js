import { base } from '$lib/server/db.js'
import { escapeAirtableFormula } from '$lib/server/security.js';

/**
 * Get users sorted by a field (coins, totalHours, or referrals) using Airtable server-side sort.
 * Note: sorting by hours expects a `totalHours` field on the User table.
 * Note: sorting by referrals expects a `referrals` field on the User table.
 * @param {number} [limit=100] - Maximum number of users to return
 * @param {number} [page=1]
 * @param {'coins'|'hours'|'referrals'} [sortBy='coins']
 */
export async function getUsersSortedByCoins(limit = 100, page = 1, sortBy = 'coins') {
    const pageSize = Number(limit) || 100;
    const targetPage = Math.max(1, Number(page) || 1);

    let sortField = 'coins';
    if (sortBy === 'hours') {
      sortField = 'totalHours';
    } else if (sortBy === 'referrals') {
      sortField = 'referrals';
    }

    const opts = {
      sort: [{ field: sortField, direction: 'desc' }],
      pageSize
    };

    // Iterate pages until we reach the requested page. Airtable's JS client
    // provides `eachPage` which we can use to fetch page-by-page and stop early.
    let done = false;
    let currentPage = 0;
  /** @type {import('airtable').Records<any>} */
  let pageRecords = [];

    await new Promise((/** @type {(value?: void) => void} */ resolve, reject) => {
      base('User').select(/** @type {any} */ (opts)).eachPage(async (records, fetchNextPage) => {
        try {
          currentPage += 1;
          if (currentPage === targetPage) {
            pageRecords = records;
            done = true;
            // Do not call fetchNextPage() — stop fetching further pages
            return resolve();
          }
          // Continue to next page until we find the target
          fetchNextPage();
        } catch (err) {
          return reject(err);
        }
      }, (err) => {
        if (err) return reject(err);
        // Reached end of records without finding target page
        return resolve();
      });
    });

    // Map selected page records (may be empty if page > total pages)
    return (pageRecords || []).map(record => ({
        username: record.fields.username,
        coins: record.fields.coins || 0,
        hours: record.fields.totalHours || 0,
        referrals: record.fields.referrals || 0
    }));

}