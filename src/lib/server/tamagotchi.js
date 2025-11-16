import { base } from '$lib/server/db.js';

/**
 * Gets the user's tamagotchi
 * @param {string} userId - The user's record ID
 * @returns {Promise<Object>} The user's tamagotchi data
 */
export async function getUserTamagotchi(userId) {
	if (!userId || typeof userId !== 'string') {
		throw new Error('Invalid userId: must be a non-empty string');
	}
	try {
		const tamagotchi = await base('Tamagotchi')
			.select({
				filterByFormula: `{id} = "${userId}"`,
				maxRecords: 1
			})
			.firstPage();
		return tamagotchi[0] || null;
	} catch (error) {
		console.error('Failed to fetch tamagotchi:', error);
	}
}

/**
 * Creates a new tamagotchi for the user
 * @param userId
 * @returns {Promise<Object>}
 */
export async function createTamagotchi(userId) {
	if (!userId || typeof userId !== 'string') {
		throw new Error('Invalid userId: must be a non-empty string');
	}
	if (await getUserTamagotchi(userId)) {
		throw new Error('User already has a tamagotchi');
	}
	try {
		return await base('Tamagotchi').create([
			{
				fields: {
					id: userId,
					name: 'Rename Me!',
					growthStage: 0,
					user: [userId]
				}
			}
		]);
	} catch (error) {
		console.error('Failed to create tamagotchi:', error);
		throw new Error(error);
	}
}

export async function updateTamagotchi(userId, updates) {
	if (!userId || typeof userId !== 'string') {
		throw new Error('Invalid userId: must be a non-empty string');
	}
	try {
		const recs = await base('Tamagotchi')
			.select({ filterByFormula: `{id} = "${userId}"`, maxRecords: 1 })
			.firstPage();
		const record = recs[0];
		await base('Tamagotchi').update(record.id, { name: updates.name });
	} catch (error) {
		console.error('Failed to update tamagotchi:', error);
		throw new Error(error);
	}
}

export async function updatePoints(userId, points) {
	if (!userId || typeof userId !== 'string') {
		throw new Error('Invalid userId: must be a non-empty string');
	}
	try {
		await base('Tamagotchi').update(userId, { points: points });
	} catch (error) {
		console.error('Failed to update tamagotchi points:', error);
		throw new Error(error);
	}
}
