import { base } from '$lib/server/db.js'

export async function getListOfShopItems() {
  // Try to sort by a custom order field first, then fall back to name
  let records;
 
    records = await base('Shop').select({
      sort: [{ field: 'sort', direction: 'asc' }]
    }).all();
  
  
  return records.map(record => ({
    id: record.id,
    name: record.fields.name,
    coins_cost: record.fields.coins_cost,
    stellarships_cost: record.fields.stellarships_cost,
    paintchips_cost: record.fields.paintchips_cost,
    image: record.fields.image,
    description: record.fields.description,
    type: record.fields.type
  }));
}
