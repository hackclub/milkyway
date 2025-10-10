import { base } from '$lib/server/db.js';
import { escapeAirtableFormula } from '$lib/server/security.js';

/**
 * Get all announcements that should be visible to a user
 * @param {string} userId - The user's record ID
 * @returns {Promise<Array<Object>>} Array of announcement objects
 */
export async function getVisibleAnnouncements(userId) {
  try {
    // First, get the user's seen announcements
    const userRecord = await base('User').find(userId);
    const seenAnnouncementIds = userRecord.fields.seen_announcements || [];
    
    // Get all announcements
    const records = await base('Announcements').select().all();
    
    // Filter announcements that are past their date and not seen by the user
    const now = new Date();
    const visibleAnnouncements = records
      .filter(record => {
        const announcementDate = new Date(record.fields.date);
        const isAfterDate = now >= announcementDate;
        const notSeen = !seenAnnouncementIds.includes(record.id);
        return isAfterDate && notSeen;
      })
      .map(record => ({
        id: record.id,
        description: record.fields.description,
        prize: record.fields.prize || '',
        date: record.fields.date
      }));
    
    return visibleAnnouncements;
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return [];
  }
}

/**
 * Mark an announcement as seen by adding it to the user's seen_announcements
 * @param {string} userId - The user's record ID
 * @param {string} announcementId - The announcement's record ID
 * @returns {Promise<boolean>} Success status
 */
export async function markAnnouncementAsSeen(userId, announcementId) {
  try {
    // Get the user's current seen announcements
    const userRecord = await base('User').find(userId);
    const seenAnnouncements = userRecord.fields.seen_announcements || [];
    
    // Add the new announcement if it's not already there
    if (!seenAnnouncements.includes(announcementId)) {
      seenAnnouncements.push(announcementId);
      await base('User').update(userId, {
        seen_announcements: seenAnnouncements
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error marking announcement as seen:', error);
    throw new Error('Failed to mark announcement as seen');
  }
}

/**
 * Parse prize string and give rewards to user
 * @param {string} userId - The user's record ID
 * @param {string} prizeString - Comma-separated prize string (e.g., "10 coins, 5 stellar ships, cow_statue")
 * @returns {Promise<Object>} Updated user values
 */
export async function giveAnnouncementRewards(userId, prizeString) {
  try {
    if (!prizeString || prizeString.trim() === '') {
      return {};
    }
    
    // Get current user values
    const userRecord = await base('User').find(userId);
    const currentCoins = userRecord.fields.coins || 0;
    const currentStellarships = userRecord.fields.stellarships || 0;
    const currentPaintchips = userRecord.fields.paintchips || 0;
    
    // Parse the prize string
    const prizes = prizeString.split(',').map(p => p.trim());
    
    let newCoins = currentCoins;
    let newStellarships = currentStellarships;
    let newPaintchips = currentPaintchips;
    const furnitureItems = [];
    
    for (const prize of prizes) {
      const lowerPrize = prize.toLowerCase();
      
      // Check for coins
      const coinsMatch = lowerPrize.match(/(\d+)\s*coins?/);
      if (coinsMatch) {
        newCoins += parseInt(coinsMatch[1]);
        continue;
      }
      
      // Check for stellar ships
      const stellarshipsMatch = lowerPrize.match(/(\d+)\s*stellar\s*ships?/);
      if (stellarshipsMatch) {
        newStellarships += parseInt(stellarshipsMatch[1]);
        continue;
      }
      
      // Check for paint chips
      const paintchipsMatch = lowerPrize.match(/(\d+)\s*paint\s*chips?/);
      if (paintchipsMatch) {
        newPaintchips += parseInt(paintchipsMatch[1]);
        continue;
      }
      
      // Otherwise, treat it as a furniture item
      if (prize.trim() !== '') {
        furnitureItems.push(prize.trim());
      }
    }
    
    // Update user's currency
    const updates = {};
    if (newCoins !== currentCoins) {
      updates.coins = newCoins;
    }
    if (newStellarships !== currentStellarships) {
      updates.stellarships = newStellarships;
    }
    if (newPaintchips !== currentPaintchips) {
      updates.paintchips = newPaintchips;
    }
    
    if (Object.keys(updates).length > 0) {
      await base('User').update(userId, updates);
    }
    
    // Create furniture items
    const { createFurniture } = await import('./furniture.js');
    for (const furnitureType of furnitureItems) {
      await createFurniture(userId, { type: furnitureType });
    }
    
    return {
      coins: newCoins,
      stellarships: newStellarships,
      paintchips: newPaintchips,
      furnitureCount: furnitureItems.length
    };
  } catch (error) {
    console.error('Error giving announcement rewards:', error);
    throw new Error('Failed to give rewards');
  }
}

