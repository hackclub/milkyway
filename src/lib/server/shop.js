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

/**
 * Get a single shop item by ID
 * @param {string} shopItemId - The shop item's record ID
 * @returns {Promise<Object>} Shop item object
 */
export async function getShopItem(shopItemId) {
  try {
    const record = await base('Shop').find(shopItemId);
    return {
      id: record.id,
      name: record.fields.name,
      coins_cost: record.fields.coins_cost || 0,
      stellarships_cost: record.fields.stellarships_cost || 0,
      paintchips_cost: record.fields.paintchips_cost || 0,
      image: record.fields.image,
      description: record.fields.description,
      type: record.fields.type
    };
  } catch (error) {
    console.error('Error fetching shop item:', error);
    throw new Error('Shop item not found');
  }
}

/**
 * SECURITY: Verify user has sufficient currency and deduct cost
 * @param {string} userId - The user's record ID
 * @param {any} costs - Object with coins_cost, stellarships_cost, paintchips_cost
 * @returns {Promise<any>} Updated currency values
 */
export async function deductCurrency(userId, costs) {
  try {
    // Get current user currency
    const userRecord = await base('User').find(userId);
    const currentCoins = Number(userRecord.fields.coins || 0);
    const currentStellarships = Number(userRecord.fields.stellarships || 0);
    const currentPaintchips = Number(userRecord.fields.paintchips || 0);
    
    // Calculate new values
    const newCoins = currentCoins - Number(costs.coins_cost || 0);
    const newStellarships = currentStellarships - Number(costs.stellarships_cost || 0);
    const newPaintchips = currentPaintchips - Number(costs.paintchips_cost || 0);
    
    // SECURITY: Verify user has sufficient currency
    if (newCoins < 0 || newStellarships < 0 || newPaintchips < 0) {
      throw new Error('Insufficient currency');
    }
    
    // Update user's currency
    await base('User').update(userId, {
      coins: newCoins,
      stellarships: newStellarships,
      paintchips: newPaintchips
    });
    
    return {
      coins: newCoins,
      stellarships: newStellarships,
      paintchips: newPaintchips
    };
  } catch (error) {
    console.error('Error deducting currency:', error);
    throw error;
  }
}
