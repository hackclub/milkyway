import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { escapeAirtableFormula, sanitizeErrorMessage } from '$lib/server/security.js';

// GET - Fetch user's address
export async function GET({ cookies }) {
  try {
    const sessionId = cookies.get('sessionid');
    
    if (!sessionId) {
      return json({
        success: false,
        error: 'No session found'
      }, { status: 401 });
    }

    // Get user info from session
    const { getUserInfoBySessionId } = await import('$lib/server/auth.js');
    const user = await getUserInfoBySessionId(sessionId);
    
    if (!user) {
      return json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Fetch user's address from Address table
    // Use email (primary identifier) for querying linked fields, not record ID
    const addressRecords = await base('Address')
      .select({
        filterByFormula: `{User} = "${escapeAirtableFormula(user.email)}"`
      })
      .firstPage();

    if (addressRecords.length === 0) {
      return json({
        success: true,
        address: null
      });
    }

    // If user has multiple addresses, log it and use the first one
    if (addressRecords.length > 1) {
      console.log(`User ${user.email} has ${addressRecords.length} addresses. Using the first one.`);
    }

    const address = addressRecords[0];
    return json({
      success: true,
      address: {
        id: address.id,
        email: address.fields.email || '',
        addressLine1: address.fields['address line 1'] || '',
        addressLine2: address.fields['address line 2'] || '',
        city: address.fields.city || '',
        state: address.fields.state || '',
        country: address.fields.country || '',
        zipcode: address.fields.zipcode || '',
        phone: address.fields.phone || ''
      }
    });

  } catch (err) {
    console.error('Airtable error:', err);
    const errorMessage = sanitizeErrorMessage(err, 'Failed to fetch address');
    
    return json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

// POST - Create or update user's address
export async function POST({ request, cookies }) {
  try {
    const { 
      addressLine1, 
      addressLine2, 
      city, 
      state, 
      country, 
      zipcode, 
      phone 
    } = await request.json();
    
    const sessionId = cookies.get('sessionid');
    
    if (!sessionId) {
      return json({
        success: false,
        error: 'No session found'
      }, { status: 401 });
    }

    // Get user info from session
    const { getUserInfoBySessionId } = await import('$lib/server/auth.js');
    const user = await getUserInfoBySessionId(sessionId);
    
    if (!user) {
      return json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Validate required fields
    if (!addressLine1 || addressLine1.trim() === '') {
      return json({
        success: false,
        error: 'Address line 1 is required'
      }, { status: 400 });
    }

    if (!city || city.trim() === '') {
      return json({
        success: false,
        error: 'City is required'
      }, { status: 400 });
    }

    if (!country || country.trim() === '') {
      return json({
        success: false,
        error: 'Country is required'
      }, { status: 400 });
    }

    // Check if address already exists - get ALL addresses for this user
    // Use email (primary identifier) for querying linked fields, not record ID
    const existingAddresses = await base('Address')
      .select({
        filterByFormula: `{User} = "${escapeAirtableFormula(user.email)}"`
      })
      .firstPage();

    const addressData = {
      'User': [user.recId],
      'email': user.email, // Use the user's email from their profile
      'address line 1': addressLine1.trim(),
      'address line 2': addressLine2?.trim() || '',
      'city': city.trim(),
      'state': state?.trim() || '',
      'country': country.trim(),
      'zipcode': zipcode?.trim() || '',
      'phone': phone?.trim() || ''
    };

    let result;
    if (existingAddresses.length > 0) {
      // If user has multiple addresses, delete all but the first one
      if (existingAddresses.length > 1) {
        console.log(`User ${user.email} has ${existingAddresses.length} addresses. Cleaning up duplicates.`);
        const addressesToDelete = existingAddresses.slice(1); // Keep first, delete rest
        const deletePromises = addressesToDelete.map(addr => 
          base('Address').destroy(addr.id)
        );
        await Promise.all(deletePromises);
      }
      
      // Update the first (and now only) address
      result = await base('Address').update(existingAddresses[0].id, addressData);
    } else {
      // Create new address
      result = await base('Address').create(addressData);
    }

    return json({
      success: true,
      message: 'Address saved successfully',
      address: {
        id: result.id,
        email: result.fields.email || '',
        addressLine1: result.fields['address line 1'] || '',
        addressLine2: result.fields['address line 2'] || '',
        city: result.fields.city || '',
        state: result.fields.state || '',
        country: result.fields.country || '',
        zipcode: result.fields.zipcode || '',
        phone: result.fields.phone || ''
      }
    });

  } catch (err) {
    console.error('Airtable error:', err);
    const errorMessage = sanitizeErrorMessage(err, 'Failed to save address');
    
    return json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
