import { json } from '@sveltejs/kit';
import { createFurniture, updateFurniture, deleteFurniture, verifyFurnitureOwnership } from '$lib/server/furniture.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
  try {
    if (!locals.user) {
      return json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { type } = await request.json();

    // Create furniture using user's record ID
    const furniture = await createFurniture(locals.user.recId, { type });

    return json({ success: true, furniture });
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

    // Verify ownership
    const isOwner = await verifyFurnitureOwnership(furnitureId, locals.user.email);
    if (!isOwner) {
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
    if (!isOwner) {
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

