import { base } from '$lib/server/db.js'


export async function getListOfEvents() {
  const records = await base('Event').select().all();
  return records.map(record => ({
    name: record.fields.name,
    website: record.fields.website,
    image: record.fields.image
  }));
}
