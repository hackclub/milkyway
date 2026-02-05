import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { escapeAirtableFormula } from '$lib/server/security.js';

export async function POST({ locals }) {
	try {
		if (!locals.user) {
			return json({ success: false, error: 'Not authenticated' }, { status: 401 });
		}

		const userRecId = locals.user.recId;

		// SECURITY: Fetch fresh user data from Airtable to prevent race conditions
		// This ensures we have the latest coins and debt values, not stale cached data
		const escapedRecId = escapeAirtableFormula(userRecId);
		const userRecords = await base('User')
			.select({
				filterByFormula: `RECORD_ID() = "${escapedRecId}"`,
				maxRecords: 1
			})
			.firstPage();

		if (!userRecords.length) {
			return json({ success: false, error: 'User not found' }, { status: 404 });
		}

		const userFields = userRecords[0].fields;
		const currentCoins = Number(userFields.coins) || 0;
		const currentDebt = Number(userFields.debt) || 0;

		// Check if user has any debt
		if (currentDebt <= 0) {
			return json({ success: false, error: 'No debt to pay' }, { status: 400 });
		}

		// Check if user has any coins
		if (currentCoins <= 0) {
			return json({ success: false, error: 'No coins to pay with' }, { status: 400 });
		}

		// Calculate payment amount (pay as much as possible, up to debt amount)
		const paymentAmount = Math.min(currentCoins, currentDebt);
		const newCoins = currentCoins - paymentAmount;
		const newDebt = currentDebt - paymentAmount;

		// Update user record with new coins and debt values
		/** @type {any} */
		const updateFields = {
			coins: newCoins,
			debt: newDebt
		};

		// If debt is fully paid, clear the debt note
		if (newDebt <= 0) {
			updateFields.debtNote = null;
		}

		await base('User').update(userRecId, updateFields);

		return json({
			success: true,
			paymentAmount,
			newCoins,
			newDebt,
			fullyPaid: newDebt <= 0
		});
	} catch (err) {
		console.error('Error paying debt:', err);
		const errorMessage = err instanceof Error ? err.message : 'Failed to pay debt';

		return json(
			{
				success: false,
				error: { message: errorMessage }
			},
			{ status: 500 }
		);
	}
}
