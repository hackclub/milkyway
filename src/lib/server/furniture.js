import { base } from '$lib/server/db.js';
import { escapeAirtableFormula } from '$lib/server/security.js';
import {
	FURNITURE_CATALOG,
	FURNITURE_TYPES,
	VALID_FURNITURE_TYPES
} from '$lib/furniture-catalog.js';

/**
 * Get all furniture for a specific user
 * @param {string} userEmail - The user's email address
 * @returns {Promise<Array<Object>>} Array of furniture objects
 */
export async function getUserFurnitureByEmail(userEmail) {
	try {
		const escapedEmail = escapeAirtableFormula(userEmail);
		const records = await base('Furniture')
			.select({ filterByFormula: `FIND("${escapedEmail}", ARRAYJOIN({user}, ","))` })
			.all();

		const furniture = records.map((record) => {
			// Parse position data (format: "x,y,flipped" or "inventory" for unplaced items)
			const positionStr =
				typeof record.fields.position === 'string' ? record.fields.position : 'inventory';
			const isPlaced = positionStr !== 'inventory';

			let x = 0,
				y = 0,
				flipped = false;
			if (isPlaced) {
				const positionParts = positionStr.split(',');
				x = parseFloat(positionParts[0]) || 0;
				y = parseFloat(positionParts[1]) || 0;
				flipped = positionParts[2] === '1';
			}

			return {
				id: record.id,
				type: record.fields.type || 'cow_statue',
				position: record.fields.position || 'inventory',
				x: x,
				y: y,
				data: record.fields.data,
				flipped: flipped,
				isPlaced: isPlaced,
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
		// SECURITY: Validate furniture type against allowed list
		const furnitureType = String(furnitureData.type || 'cow_statue');
		if (!VALID_FURNITURE_TYPES.includes(furnitureType)) {
			throw new Error('Invalid furniture type');
		}

		// Get user record to retrieve username
		const userRecord = await base('User').find(userId);
		const username = String(userRecord.fields.username || '');

		// New furniture starts in inventory (not placed)
		const position = 'inventory';

		if (furnitureData.isInteractable) {
			/** @type {any} */
			const fieldsToCreate = {
				user: [userId],
				type: furnitureType,
				position: position,
				data: JSON.stringify({ name: username })
			};
		}

		/** @type {any} */
		const fieldsToCreate = {
			user: [userId],
			type: furnitureType,
			position: position
		};

		const record = /** @type {any} */ (await base('Furniture').create(fieldsToCreate));

		return {
			id: record.id,
			type: record.fields.type || 'cow_statue',
			position: record.fields.position,
			x: 0,
			y: 0,
			flipped: false,
			isPlaced: false,
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
		// SECURITY: Only allow updating position and data, never allow changing ownership or type
		const safeUpdates = {};
		if (updates.position !== undefined) {
			safeUpdates.position = updates.position;
		}
		console.log(updates.data);
		if (updates.data !== undefined) {
			safeUpdates.data = updates.data;
		}

		const record = await base('Furniture').update(furnitureId, safeUpdates);

		// Parse position data (format: "x,y,flipped" or "inventory" for unplaced items)
		const positionStr =
			typeof record.fields.position === 'string' ? record.fields.position : 'inventory';
		const isPlaced = positionStr !== 'inventory';

		let x = 0,
			y = 0,
			flipped = false;
		if (isPlaced) {
			const positionParts = positionStr.split(',');
			x = parseFloat(positionParts[0]) || 0;
			y = parseFloat(positionParts[1]) || 0;
			flipped = positionParts[2] === '1';
		}

		return {
			id: record.id,
			type: record.fields.type || 'cow_statue',
			position: record.fields.position || 'inventory',
			x: x,
			y: y,
			data: record.fields.data,
			flipped: flipped,
			isPlaced: isPlaced,
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
		const furnitureUserIds = Array.isArray(furnitureUserField)
			? furnitureUserField
			: furnitureUserField
				? [String(furnitureUserField)]
				: [];

		if (furnitureUserIds.length === 0) {
			return false;
		}

		// Fetch user records to get emails
		const userRecords = await base('User')
			.select({
				filterByFormula: `OR(${furnitureUserIds.map(/** @param {string} id */ (id) => `RECORD_ID() = "${escapeAirtableFormula(id)}"`).join(', ')})`
			})
			.firstPage();

		const emails = userRecords.map((r) => r.fields.email);
		return emails.includes(userEmail);
	} catch (error) {
		console.error('Error verifying furniture ownership:', error);
		return false;
	}
}
