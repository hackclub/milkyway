import { json } from '@sveltejs/kit';
import { getUserCoinsAndStellarships } from '$lib/server/auth.js';
import { getUserFurnitureByEmail } from '$lib/server/furniture.js';

export async function GET({ locals }) {
  try {
    if (!locals.user) {
      return json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Get updated coins, stellarships, paintchips
    const { coins, stellarships, paintchips } = await getUserCoinsAndStellarships(locals.user.recId);
    
    // Get updated furniture list
    const furniture = await getUserFurnitureByEmail(locals.user.email);

    return json({
      success: true,
      coins,
      stellarships,
      paintchips,
      furniture
    });
  } catch (err) {
    console.error('Error fetching user data:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to get user data';
    
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 500 });
  }
}

