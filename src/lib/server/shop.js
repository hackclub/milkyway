import { base } from '$lib/server/db.js'
import { escapeAirtableFormula } from '$lib/server/security.js';

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
    type: record.fields.type,
    one_time: Boolean(record.fields['one-time'] || record.fields.one_time)
  }));
}

export async function getListOfShopVotingItems() {
  // Try to sort by a custom order field first, then fall back to name
  let records;
 
    records = await base('ShopVoting').select({
      sort: [{ field: 'votes', direction: 'desc' }]
    }).all();
  
  
  return records.map(record => ({
    id: record.id,
    name: record.fields.name,
    image: record.fields.image,
    description: record.fields.description,
    votes: record.fields.votes,
    maxVotes: record.fields.maxVotes
  }));
}

export async function getUserVotes(userId) {
  try {
    const record = await base('User').find(userId);
      return {
        id: record.id,
        votes: record.fields.votes
      };

  } catch (error) {
    console.error('Error fetching user votes:', error);
    return [];
  }
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
      type: record.fields.type,
      one_time: Boolean(record.fields['one-time'] || record.fields.one_time)
    };
  } catch (error) {
    console.error('Error fetching shop item:', error);
    throw new Error('Shop item not found');
  }
}

/**
 * Get a single shop item by ID
 * @param {string} voteItemId - The shop item's record ID
 * @returns {Promise<Object>} Shop item object
 */
export async function getVoteItem(voteItemId) {
  try {
    const record = await base('ShopVoting').find(voteItemId);
    return {
      id: record.id,
      name: record.fields.name,
      image: record.fields.image,
      description: record.fields.description,
      votes: record.fields.votes,
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
    // SECURITY: Validate input costs
    const coinsCost = Number(costs.coins_cost || 0);
    const stellarshipsCost = Number(costs.stellarships_cost || 0);
    const paintchipsCost = Number(costs.paintchips_cost || 0);
    
    if (isNaN(coinsCost) || isNaN(stellarshipsCost) || isNaN(paintchipsCost) ||
        coinsCost < 0 || stellarshipsCost < 0 || paintchipsCost < 0) {
      throw new Error('Invalid cost values');
    }
    
    // Get current user currency with retry mechanism
    let retries = 3;
    while (retries > 0) {
      try {
        const userRecord = await base('User').find(userId);
        const currentCoins = Number(userRecord.fields.coins || 0);
        const currentStellarships = Number(userRecord.fields.stellarships || 0);
        const currentPaintchips = Number(userRecord.fields.paintchips || 0);
        
        // SECURITY: Double-check currency values are valid
        if (isNaN(currentCoins) || isNaN(currentStellarships) || isNaN(currentPaintchips)) {
          throw new Error('Invalid currency values in database');
        }
        
        // Calculate new values
        const newCoins = currentCoins - coinsCost;
        const newStellarships = currentStellarships - stellarshipsCost;
        const newPaintchips = currentPaintchips - paintchipsCost;
        
        // SECURITY: Verify user has sufficient currency
        if (newCoins < 0 || newStellarships < 0 || newPaintchips < 0) {
          throw new Error('Insufficient currency');
        }
        
        // SECURITY: Validate new values are reasonable (prevent negative overflow)
        if (newCoins > 999999 || newStellarships > 999999 || newPaintchips > 999999) {
          throw new Error('Currency values too large');
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
        retries--;
        if (retries === 0) throw error;
        // Wait a bit before retry to handle race conditions
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } catch (error) {
    console.error('Error deducting currency:', error);
    throw error;
  }
}

/**
 * Rollback currency deduction (add back the costs)
 * Used when purchase recording fails to restore user's money
 * @param {string} userId - The user's record ID
 * @param {any} costs - Object with coins_cost, stellarships_cost, paintchips_cost
 * @returns {Promise<any>} Restored currency values
 */
export async function rollbackCurrency(userId, costs) {
  try {
    const coinsCost = Number(costs.coins_cost || 0);
    const stellarshipsCost = Number(costs.stellarships_cost || 0);
    const paintchipsCost = Number(costs.paintchips_cost || 0);
    
    // Get current user currency
    const userRecord = await base('User').find(userId);
    const currentCoins = Number(userRecord.fields.coins || 0);
    const currentStellarships = Number(userRecord.fields.stellarships || 0);
    const currentPaintchips = Number(userRecord.fields.paintchips || 0);
    
    // Add back the costs (restore currency)
    const restoredCoins = currentCoins + coinsCost;
    const restoredStellarships = currentStellarships + stellarshipsCost;
    const restoredPaintchips = currentPaintchips + paintchipsCost;
    
    // Update user's currency (restore it)
    await base('User').update(userId, {
      coins: restoredCoins,
      stellarships: restoredStellarships,
      paintchips: restoredPaintchips
    });
    
    return {
      coins: restoredCoins,
      stellarships: restoredStellarships,
      paintchips: restoredPaintchips
    };
  } catch (error) {
    console.error('Error rolling back currency:', error);
    throw error;
  }
}

/**
 * Get user's current currency
 * @param {string} userId - The user's record ID
 * @returns {Promise<any>} User's current currency
 */
export async function getUserCurrency(userId) {
  try {
    const userRecord = await base('User').find(userId);
    return {
      coins: Number(userRecord.fields.coins || 0),
      stellarships: Number(userRecord.fields.stellarships || 0),
      paintchips: Number(userRecord.fields.paintchips || 0)
    };
  } catch (error) {
    console.error('Error fetching user currency:', error);
    throw new Error('User not found');
  }
}

/**
 * Create a purchase record
 * @param {string} userEmail - The user's email address
 * @param {string} itemId - The shop item's record ID
 * @param {any} costs - Object with coins_cost, stellarships_cost, paintchips_cost
 * @returns {Promise<any>} Purchase record
 */
export async function createPurchase(userEmail, itemId, costs) {
  try {
    // Get user record ID from email
    const userRecords = await base('User').select({
      filterByFormula: `{email} = "${userEmail}"`,
      maxRecords: 1
    }).firstPage();
    
    if (userRecords.length === 0) {
      throw new Error('User not found');
    }
    
    const userRecordId = userRecords[0].id;
    
    // Get shop item record ID
    /** @type {any} */
    const shopItem = await getShopItem(itemId);
    const actualRecordId = shopItem.id;
    
    const purchaseRecord = await base('Purchases').create({
      by: [userRecordId], // User record ID in array format
      item: [actualRecordId], // Shop item record ID in array format
      coins_price: Number(costs.coins_cost || 0),
      stellarships_price: Number(costs.stellarships_cost || 0),
      paintchips_price: Number(costs.paintchips_cost || 0),
      notes: ''
    });
    
    return {
      id: purchaseRecord.id,
      by: userEmail,
      item: itemId,
      coins_price: Number(costs.coins_cost || 0),
      stellarships_price: Number(costs.stellarships_cost || 0),
      paintchips_price: Number(costs.paintchips_cost || 0),
      fulfilled_on: null,
      notes: ''
    };
  } catch (error) {
    console.error('Error creating purchase:', error);
    throw new Error('Failed to record purchase');
  }
}



/**
 * Get user's purchase history
 * @param {string} userEmail - The user's email address
 * @returns {Promise<any[]>} Array of purchase records with item details
 */
export async function getUserPurchaseHistory(userEmail) {
  try {
    // SECURITY: Escape user email to prevent injection attacks
    const escapedEmail = escapeAirtableFormula(userEmail);
    
    const records = await base('Purchases')
      .select({
        filterByFormula: `{by} = "${escapedEmail}"`,
        sort: [{ field: 'Created', direction: 'desc' }]
      })
      .all();

    // Get item details for each purchase
    const purchasesWithItems = await Promise.all(
      records.map(async (record) => {
        const fields = record.fields;
        const itemId = Array.isArray(fields.item) ? fields.item[0] : fields.item; // Get first item ID from linked record
        
        let itemDetails = null;
        if (itemId) {
          try {
            itemDetails = await getShopItem(itemId);
          } catch (error) {
            console.error('Error fetching item details:', error);
          }
        }

        return {
          id: record.id,
          created: fields.Created || new Date().toISOString(),
          item: itemDetails,
          coins_price: Number(fields.coins_price || 0),
          stellarships_price: Number(fields.stellarships_price || 0),
          paintchips_price: Number(fields.paintchips_price || 0),
          fulfilled_on: fields['fulfilled on'] || null,
          notes: String(fields.notes || '')
        };
      })
    );

    return purchasesWithItems;
  } catch (error) {
    console.error('Error fetching purchase history:', error);
    throw new Error('Failed to fetch purchase history');
  }
}

/**
 * Check for recent duplicate purchases (within last 30 seconds)
 * @param {string} userEmail - The user's email address
 * @param {string} itemId - The shop item's record ID
 * @returns {Promise<boolean>} True if duplicate found
 */
async function checkDuplicatePurchase(userEmail, itemId) {
  try {
    // SECURITY: Escape inputs to prevent injection attacks
    const escapedEmail = escapeAirtableFormula(userEmail);
    const escapedItemId = escapeAirtableFormula(itemId);
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    
    const records = await base('Purchases')
      .select({
        filterByFormula: `AND({by} = "${escapedEmail}", FIND("${escapedItemId}", ARRAYJOIN({item}, ",")) > 0, {Created} > "${thirtySecondsAgo}")`,
        maxRecords: 1
      })
      .firstPage();
    
    return records.length > 0;
  } catch (error) {
    console.error('Error checking duplicate purchase:', error);
    return false; // Allow purchase if check fails
  }
}

/**
 * Check if user has already purchased a one-time item
 * @param {string} userEmail - The user's email address
 * @param {string} itemId - The shop item's record ID
 * @returns {Promise<boolean>} True if user has already purchased this one-time item
 */
async function checkOneTimePurchase(userEmail, itemId) {
  try {
    // SECURITY: Escape inputs to prevent injection attacks
    const escapedEmail = escapeAirtableFormula(userEmail);
    const escapedItemId = escapeAirtableFormula(itemId);
    
    const records = await base('Purchases')
      .select({
        filterByFormula: `AND({by} = "${escapedEmail}", FIND("${escapedItemId}", ARRAYJOIN({item}, ",")) > 0)`,
        maxRecords: 1
      })
      .firstPage();
    
    return records.length > 0;
  } catch (error) {
    console.error('Error checking one-time purchase:', error);
    return false; // Allow purchase if check fails
  }
}

/**
 * Complete a purchase: deduct currency and record purchase
 * @param {string} userId - The user's record ID
 * @param {string} userEmail - The user's email address
 * @param {string} itemId - The shop item's record ID
 * @returns {Promise<any>} Purchase result with updated currency
 */
export async function completePurchase(userId, userEmail, itemId) {
  try {
    // SECURITY: Check for duplicate purchases within 30 seconds
    const isDuplicate = await checkDuplicatePurchase(userEmail, itemId);
    if (isDuplicate) {
      throw new Error('Duplicate purchase detected. Please wait before purchasing the same item again.');
    }

    // Get shop item details
    /** @type {any} */
    const shopItem = await getShopItem(itemId);
    
    // SECURITY: Validate item exists and has valid pricing
    if (!shopItem || (!shopItem.coins_cost && !shopItem.stellarships_cost && !shopItem.paintchips_cost)) {
      throw new Error('Invalid shop item');
    }

    // SECURITY: Check if item is one-time and user has already purchased it
    if (shopItem.one_time) {
      const hasPurchased = await checkOneTimePurchase(userEmail, itemId);
      if (hasPurchased) {
        throw new Error('This item can only be purchased once and you have already bought it.');
      }
    }
    
    // Check if user has sufficient currency (fresh check)
    const userCurrency = await getUserCurrency(userId);
    const costs = {
      coins_cost: Number(shopItem.coins_cost || 0),
      stellarships_cost: Number(shopItem.stellarships_cost || 0),
      paintchips_cost: Number(shopItem.paintchips_cost || 0)
    };
    
    // SECURITY: Validate costs are positive numbers
    if (costs.coins_cost < 0 || costs.stellarships_cost < 0 || costs.paintchips_cost < 0) {
      throw new Error('Invalid item pricing');
    }
    
    if (userCurrency.coins < costs.coins_cost || 
        userCurrency.stellarships < costs.stellarships_cost || 
        userCurrency.paintchips < costs.paintchips_cost) {
      throw new Error('Insufficient currency');
    }
    
    // SECURITY: Atomic transaction - deduct currency first, then record purchase
    // If purchase recording fails, we'll rollback the currency
    const updatedCurrency = await deductCurrency(userId, costs);
    
    try {
      // Record purchase
      const purchase = await createPurchase(userEmail, itemId, costs);
      
      // NOTE: Furniture is now handled by a separate purchase system (/api/purchase-furniture)
      // The Shop table should only contain prizes and one-time items, not furniture
      
      return {
        success: true,
        purchase,
        currency: updatedCurrency,
        item: shopItem
      };
    } catch (purchaseError) {
      // ROLLBACK: If purchase recording fails, restore the user's currency
      console.error('Purchase recording failed, rolling back currency:', purchaseError);
      
      try {
        await rollbackCurrency(userId, costs);
        console.log('Currency rollback successful');
      } catch (rollbackError) {
        console.error('CRITICAL: Currency rollback failed:', rollbackError);
        // This is a critical error - user lost money but purchase wasn't recorded
        // In production, you'd want to alert administrators
      }
      
      throw purchaseError; // Re-throw the original error
    }
  } catch (error) {
    console.error('Error completing purchase:', error);
    throw error;
  }
}

/**
 * Complete a vote: deduct currency and record purchase
 * @param {string} userId - The user's record ID
 * @param {string} userEmail - The user's email address
 * @param {string} itemId - The shop item's record ID
 * @param {number} voteAmount - The amount of votes to purchase
 * @returns {Promise<any>} Purchase result with updated currency
 */
export async function completeVote(userId, userEmail, itemId, voteAmount) {
  try {
    // SECURITY: Check for duplicate purchases within 30 seconds
    const isDuplicate = await checkDuplicatePurchase(userEmail, itemId);
    if (isDuplicate) {
      throw new Error('Duplicate purchase detected. Please wait before purchasing the same item again.');
    }

    // Get shop item details
    /** @type {any} */
    const shopItem = await getVoteItem(itemId);
    
    // SECURITY: Validate item exists and has valid pricing
    if (!shopItem) {
      throw new Error('Invalid item');
    }

    
    // Check if user has sufficient currency (fresh check)
    const userCurrency = await getUserCurrency(userId);

    
    
    if (userCurrency.coins < voteAmount ) {
      throw new Error('Insufficient currency');
    }
     const costs = {
      coins_cost: Number(voteAmount),
      stellarships_cost: Number(0),
      paintchips_cost: Number(0)
    };
    // SECURITY: Atomic transaction - deduct currency first, then record purchase
    // If purchase recording fails, we'll rollback the currency
    const updatedCurrency = await deductCurrency(userId, costs);


    
    try {
      // Record purchase

      const vote = (await base('ShopVoting').find(itemId)).updateFields({
        votes: (shopItem.votes || 0) + voteAmount
      });
      
      return {
        success: true,
        currency: updatedCurrency,
        item: shopItem
      };
    } catch (purchaseError) {
      // ROLLBACK: If purchase recording fails, restore the user's currency
      console.error('Purchase recording failed, rolling back currency:', purchaseError);
      
      try {
        await rollbackCurrency(userId, costs);
        console.log('Currency rollback successful');
      } catch (rollbackError) {
        console.error('CRITICAL: Currency rollback failed:', rollbackError);
        // This is a critical error - user lost money but purchase wasn't recorded
        // In production, you'd want to alert administrators
      }
      
      throw purchaseError; // Re-throw the original error
    }
  } catch (error) {
    console.error('Error completing purchase:', error);
    throw error;
  }
}
