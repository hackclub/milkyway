import { json } from '@sveltejs/kit';
import { createFurniture } from '$lib/server/furniture.js';
import { base } from '$lib/server/db.js';
import { checkRateLimit } from '$lib/server/security.js';
import { FURNITURE_CATALOG, VALID_FURNITURE_TYPES } from '$lib/furniture-catalog.js';

// Track recent purchases to prevent duplicates (simple in-memory cache)
const recentPurchases = new Map();

// Clean old entries every minute
setInterval(() => {
  const fiveSecondsAgo = Date.now() - 5000;
  for (const [key, timestamp] of recentPurchases.entries()) {
    if (timestamp < fiveSecondsAgo) {
      recentPurchases.delete(key);
    }
  }
}, 60000);

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
  try {
    // Authentication
    if (!locals.user) {
      return json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Parse and validate request
    const { furnitureType } = await request.json();

    // Rate limiting: 10 furniture purchases per minute
    if (!checkRateLimit(`furniture-purchase:${locals.user.email}`, 10, 60000)) {
      return json({
        success: false,
        error: 'Too many purchase attempts. Please wait a moment.'
      }, { status: 429 });
    }

    // SECURITY: Prevent duplicate purchases within 5 seconds
    const purchaseKey = `${locals.user.recId}:${String(furnitureType)}`;
    const lastPurchase = recentPurchases.get(purchaseKey);
    if (lastPurchase && (Date.now() - lastPurchase) < 5000) {
      return json({
        success: false,
        error: 'Please wait before purchasing the same item again.'
      }, { status: 429 });
    }

    // Mark this purchase
    recentPurchases.set(purchaseKey, Date.now());
    
    if (!furnitureType || typeof furnitureType !== 'string' || furnitureType.length > 50) {
      return json({ success: false, error: 'Invalid furniture type' }, { status: 400 });
    }

    // SECURITY: Validate furniture type against allowed list
    if (!VALID_FURNITURE_TYPES.includes(furnitureType)) {
      return json({ success: false, error: 'Furniture not found' }, { status: 404 });
    }

    // Get furniture from catalog
    const furniture = FURNITURE_CATALOG[furnitureType];
    
    if (!furniture) {
      return json({ success: false, error: 'Furniture not found' }, { status: 404 });
    }

    if (furniture.purchasable === false) {
      return json({ 
        success: false, 
        error: 'This furniture can only be obtained through rewards' 
      }, { status: 403 });
    }

    // SECURITY: Use retry mechanism to handle race conditions (like in shop.js)
    let retries = 3;
    let newFurniture = null;
    let updatedCurrency = null;
    
    while (retries > 0) {
      try {
        // Get fresh user currency
        const userRecord = await base('User').find(locals.user.recId);
        const currentPaintchips = Number(userRecord.fields.paintchips || 0);

        // SECURITY: Validate currency value
        if (isNaN(currentPaintchips)) {
          throw new Error('Invalid currency value in database');
        }

        // Check sufficient funds
        if (currentPaintchips < furniture.cost) {
          return json({ 
            success: false, 
            error: 'Insufficient paintchips' 
          }, { status: 400 });
        }

        // Calculate new balance
        const newPaintchips = currentPaintchips - furniture.cost;

        // SECURITY: Validate new value is reasonable
        if (newPaintchips < 0 || newPaintchips > 999999) {
          throw new Error('Invalid currency calculation');
        }

        // ATOMIC: Deduct currency
        await base('User').update(locals.user.recId, {
          paintchips: newPaintchips
        });

        // Create furniture for user
        try {
          newFurniture = await createFurniture(locals.user.recId, { 
            type: furnitureType 
          });

          updatedCurrency = {
            coins: Number(userRecord.fields.coins || 0),
            stellarships: Number(userRecord.fields.stellarships || 0),
            paintchips: newPaintchips
          };

          // Success - break out of retry loop
          break;
        } catch (furnitureError) {
          // ROLLBACK: Restore currency if furniture creation failed
          console.error('Furniture creation failed, rolling back currency:', furnitureError);
          await base('User').update(locals.user.recId, {
            paintchips: currentPaintchips
          });
          throw furnitureError;
        }
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        // Wait before retry to handle race conditions
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return json({
      success: true,
      furniture: newFurniture,
      currency: updatedCurrency
    });

  } catch (error) {
    console.error('Furniture purchase error:', error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Purchase failed'
    }, { status: 500 });
  }
}
