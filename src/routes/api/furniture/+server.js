import { json } from '@sveltejs/kit';
import {
	createFurniture,
	updateFurniture,
	deleteFurniture,
	verifyFurnitureOwnership
} from '$lib/server/furniture.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
	try {
		if (!locals.user) {
			return json({ success: false, error: 'Not authenticated' }, { status: 401 });
		}

		// SECURITY: Disable direct furniture creation until shop is live
		// Users should only be able to acquire furniture through:
		// 1. Shop purchases (via /api/shop/purchase endpoint - see below)
		// 2. Announcement rewards (handled in /api/redeem-announcement)
		// 3. Other reward systems (to be implemented)
		return json(
			{
				success: false,
				error:
					'Direct furniture creation is disabled. Furniture can only be acquired through the shop or special events.'
			},
			{ status: 403 }
		);

		/* TODO: When shop goes live, DELETE this POST endpoint entirely and use /api/shop/purchase instead
		 *
		 * Create a new endpoint at /api/shop/purchase with this secure implementation:
		 *
		 * import { getShopItem, deductCurrency } from '$lib/server/shop.js';
		 * import { createFurniture } from '$lib/server/furniture.js';
		 *
		 * export async function POST({ request, locals }) {
		 *   if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });
		 *
		 *   const { shopItemId } = await request.json();
		 *
		 *   // 1. Get shop item from database (SERVER-SIDE - never trust client prices!)
		 *   const shopItem = await getShopItem(shopItemId);
		 *
		 *   // 2. Verify sufficient currency and deduct (atomic operation)
		 *   const newCurrency = await deductCurrency(locals.user.recId, {
		 *     coins_cost: shopItem.coins_cost,
		 *     stellarships_cost: shopItem.stellarships_cost,
		 *     paintchips_cost: shopItem.paintchips_cost
		 *   });
		 *
		 *   // 3. Create furniture/item for user
		 *   const item = await createFurniture(locals.user.recId, { type: shopItem.type });
		 *
		 *   return json({ success: true, item, currency: newCurrency });
		 * }
		 */
	} catch (error) {
		console.error('Error in furniture POST:', error);
		return json({ success: false, error: 'Failed to create furniture' }, { status: 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function PUT({ request, locals }) {
	try {
		if (!locals.user) {
			return json({ success: false, error: 'Not authenticated' }, { status: 401 });
		}

		const { furnitureId, updates } = await request.json();

		if (!furnitureId) {
			return json({ success: false, error: 'Furniture ID required' }, { status: 400 });
		}

		const isOwner = await verifyFurnitureOwnership(furnitureId, locals.user.email);

		let canEdit = false;

		const { getFurnitureById } = await import('$lib/server/furniture.js');
		const furnitureItem = await getFurnitureById(furnitureId);

		if (furnitureItem && furnitureItem.type === 'sticky_note') {
			try {
				const noteData = furnitureItem.data ? JSON.parse(furnitureItem.data) : {};

				if (updates.data !== undefined) {
					if (noteData.author === locals.user.recId || !noteData.author) {
						canEdit = true;
					} else {
						return json(
							{
								success: false,
								error: 'Only the note author can edit the message'
							},
							{ status: 403 }
						);
					}
				}

				// Only the room owner can move the sticky note
				if (updates.position !== undefined) {
					if (isOwner) {
						canEdit = true;
					} else {
						return json(
							{
								success: false,
								error: 'Only the room owner can move sticky notes'
							},
							{ status: 403 }
						);
					}
				}
			} catch (e) {
				console.error('Error parsing sticky note data:', e);
				return json({ success: false, error: 'Invalid sticky note data' }, { status: 400 });
			}
		} else {
			canEdit = isOwner;
		}

		if (!canEdit) {
			return json({ success: false, error: 'Not authorized' }, { status: 403 });
		}

		// Update furniture
		const furniture = await updateFurniture(furnitureId, updates);

		return json({ success: true, furniture });
	} catch (error) {
		console.error('Error in furniture PUT:', error);
		return json({ success: false, error: 'Failed to update furniture' }, { status: 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ request, locals }) {
	try {
		if (!locals.user) {
			return json({ success: false, error: 'Not authenticated' }, { status: 401 });
		}

		const { furnitureId } = await request.json();

		if (!furnitureId) {
			return json({ success: false, error: 'Furniture ID required' }, { status: 400 });
		}

		// Verify ownership
		const isOwner = await verifyFurnitureOwnership(furnitureId, locals.user.email);

		// Sticky notes can be deleted by their author OR room owner
		let canDelete = isOwner;

		if (!isOwner) {
			const { getFurnitureById } = await import('$lib/server/furniture.js');
			const furnitureToDelete = await getFurnitureById(furnitureId);

			if (furnitureToDelete && furnitureToDelete.type === 'sticky_note') {
				try {
					const noteData = furnitureToDelete.data ? JSON.parse(furnitureToDelete.data) : {};
					if (noteData.author === locals.user.recId) {
						canDelete = true;
					}
				} catch (e) {
					console.error('Error parsing sticky note data:', e);
				}
			}
		}

		if (!canDelete) {
			return json({ success: false, error: 'Not authorized' }, { status: 403 });
		}

		// Delete furniture
		await deleteFurniture(furnitureId);

		return json({ success: true });
	} catch (error) {
		console.error('Error in furniture DELETE:', error);
		return json({ success: false, error: 'Failed to delete furniture' }, { status: 500 });
	}
}
