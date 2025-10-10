import { base } from '$lib/server/db.js';
import { escapeAirtableFormula } from '$lib/server/security.js';

/**
 * Get all furniture for a specific user
 * @param {string} userEmail - The user's email address
 * @returns {Promise<Array<Object>>} Array of furniture objects
 */
export async function getUserFurnitureByEmail(userEmail) {
  try {
    const escapedEmail = escapeAirtableFormula(userEmail);
    const records = await base('Furniture')
      .select({ filterByFormula: `FIND("${escapedEmail}", ARRAYJOIN({user}, ","))`}).all();

    const furniture = records.map(record => {
      // Parse position data (format: "x,y,flipped")
      const positionStr = typeof record.fields.position === 'string' ? record.fields.position : '0,0,0';
      const positionParts = positionStr.split(',');
      const x = parseFloat(positionParts[0]) || 0;
      const y = parseFloat(positionParts[1]) || 0;
      const flipped = positionParts[2] === '1';
      
      return {
        id: record.id,
        type: record.fields.type || 'cow_statue',
        position: record.fields.position || '0,0,0',
        x: x,
        y: y,
        flipped: flipped,
        created: record.fields.Created
      };
    });

    return furniture;
  } catch (error) {
    console.error('Error fetching user furniture:', error);
    return [];
  }
}

/**
 * Create a new furniture item in Airtable
 * @param {string} userId - The user's record ID
 * @param {any} furnitureData - Furniture data to create
 * @returns {Promise<Object>} Created furniture object
 */
export async function createFurniture(userId, furnitureData) {
  try {
    // Generate random position for the furniture (format: "x,y,flipped")
    const randomX = Math.random() * (120 - (-120)) + (-120); // Range: -120 to 120
    const randomY = Math.random() * (220 - 80) + 80; // Range: 80 to 220
    const position = `${randomX},${randomY},0`;
    
    /** @type {any} */
    const fieldsToCreate = {
      'user': [userId],
      'type': furnitureData.type || 'cow_statue',
      'position': position
    };
    
    const record = /** @type {any} */ (await base('Furniture').create(fieldsToCreate));

    // Parse position for return object (format: "x,y,flipped")
    const positionStr = typeof record.fields.position === 'string' ? record.fields.position : '0,0,0';
    const positionParts = positionStr.split(',');
    const x = parseFloat(positionParts[0]) || 0;
    const y = parseFloat(positionParts[1]) || 0;
    const flipped = positionParts[2] === '1';

    return {
      id: record.id,
      type: record.fields.type || 'cow_statue',
      position: record.fields.position,
      x: x,
      y: y,
      flipped: flipped,
      created: record.fields.Created
    };
  } catch (error) {
    console.error('Error creating furniture:', error);
    throw new Error('Failed to create furniture');
  }
}

/**
 * Update an existing furniture item
 * @param {string} furnitureId - The furniture's record ID
 * @param {any} updates - Fields to update
 * @returns {Promise<Object>} Updated furniture object
 */
export async function updateFurniture(furnitureId, updates) {
  try {
    const record = await base('Furniture').update(furnitureId, updates);

    // Parse position data (format: "x,y,flipped")
    const positionStr = typeof record.fields.position === 'string' ? record.fields.position : '0,0,0';
    const positionParts = positionStr.split(',');
    const x = parseFloat(positionParts[0]) || 0;
    const y = parseFloat(positionParts[1]) || 0;
    const flipped = positionParts[2] === '1';

    return {
      id: record.id,
      type: record.fields.type || 'cow_statue',
      position: record.fields.position || '0,0,0',
      x: x,
      y: y,
      flipped: flipped,
      created: record.fields.Created
    };
  } catch (error) {
    console.error('Error updating furniture:', error);
    throw new Error('Failed to update furniture');
  }
}

/**
 * Delete a furniture item
 * @param {string} furnitureId - The furniture's record ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteFurniture(furnitureId) {
  try {
    await base('Furniture').destroy(furnitureId);
    return true;
  } catch (error) {
    console.error('Error deleting furniture:', error);
    throw new Error('Failed to delete furniture');
  }
}

/**
 * Verify if a user owns a specific furniture item
 * @param {string} furnitureId - The furniture's record ID
 * @param {string} userEmail - The user's email address
 * @returns {Promise<boolean>} True if user owns the furniture
 */
export async function verifyFurnitureOwnership(furnitureId, userEmail) {
  try {
    const record = await base('Furniture').find(furnitureId);
    const furnitureUserField = record.fields.user;
    
    // Convert to array if it's not already
    /** @type {string[]} */
    const furnitureUserIds = Array.isArray(furnitureUserField) ? furnitureUserField : 
                           (furnitureUserField ? [String(furnitureUserField)] : []);
    
    if (furnitureUserIds.length === 0) {
      return false;
    }
    
    // Fetch user records to get emails
    const userRecords = await base('User')
      .select({
        filterByFormula: `OR(${furnitureUserIds.map(/** @param {string} id */ id => `RECORD_ID() = "${escapeAirtableFormula(id)}"`).join(', ')})`,
      })
      .firstPage();
    
    const emails = userRecords.map(r => r.fields.email);
    return emails.includes(userEmail);
  } catch (error) {
    console.error('Error verifying furniture ownership:', error);
    return false;
  }
}

