import { base } from '$lib/server/db.js'
import { escapeAirtableFormula } from '$lib/server/security.js';

export async function getUsersSortedByCoins() {
    let records;
    records = await base('User').select({
      sort: [{ field: 'coins', direction: 'desc' }]
    }).all();
    
    return records.map(record => ({
        username: record.fields.username,
        coins: record.fields.coins,
    }));

}