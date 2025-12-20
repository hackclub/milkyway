import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { escapeAirtableFormula } from '$lib/server/security.js';
import { verifyProjectOwnership } from '$lib/server/projects.js';

export async function GET({ url, cookies }) {
	try {
		const sessionId = cookies.get('sessionid');
		if (!sessionId) {
			return json({ success: false, error: 'Not authenticated' }, { status: 401 });
		}

		const userInfo = await getUserInfoBySessionId(sessionId);
		if (!userInfo || !userInfo.email) {
			return json({ success: false, error: 'User not found' }, { status: 404 });
		}

		const projectId = url.searchParams.get('projectId');
		if (!projectId) {
			return json({ success: false, error: 'Project ID required' }, { status: 400 });
		}

		// SECURITY: Verify project ownership before allowing access to bet data
		const isOwner = await verifyProjectOwnership(projectId, userInfo.email);
		if (!isOwner) {
			return json({ success: false, error: 'Project does not belong to user' }, { status: 403 });
		}

		// Get the project's primary identifier (projectid field)
		// When querying linked fields in Airtable formulas, we must use the primary field value,
		// not the record ID. The Projects linked field shows projectid values, not record IDs.
		const { base: projectsBase } = await import('$lib/server/db.js');
		const projectRecord = await projectsBase('Projects').find(projectId);
		const projectPrimaryId = projectRecord.fields.projectid;
		const escapedProjectPrimaryId = escapeAirtableFormula(String(projectPrimaryId || projectId));

		// Get unrewarded bets for this project
		// attachedProject is a single select linked record field
		const betsTable = base('Bets');
		
		// Query using the project's primary identifier (projectid), not record ID
		// attachedProject is stored as an array of record IDs, but ARRAYJOIN resolves to primary identifiers
		// NOTE: When using ARRAYJOIN in Airtable formulas, linked records resolve to their primary identifier (projectid)
		// So we must use the projectid value, not the record ID, even though it's stored as record IDs
		const escapedProjectRecordId = escapeAirtableFormula(projectId);
		let betRecords = await betsTable
			.select({
				filterByFormula: `AND(
					OR(
						FIND("|${escapedProjectPrimaryId}|", "|" & ARRAYJOIN({attachedProject}, "|") & "|") > 0,
						FIND("|${escapedProjectRecordId}|", "|" & ARRAYJOIN({attachedProject}, "|") & "|") > 0
					),
					OR(
						{status} = "claimed",
						{status} = "won"
					),
					OR(
						BLANK({rewarded}),
						NOT({rewarded}),
						{rewarded} = FALSE()
					)
				)`
			})
			.all();
		
		const unrewardedBets = betRecords.map(bet => {
			const coinsEarned = typeof bet.fields.coinsEarned === 'number' 
				? bet.fields.coinsEarned 
				: Math.round((bet.fields.betAmount || 0) * (bet.fields.multiplier || 1));
			return {
				id: bet.id,
				coinsEarned,
				betAmount: bet.fields.betAmount,
				multiplier: bet.fields.multiplier
			};
		});

		const totalCoins = unrewardedBets.reduce((sum, bet) => sum + (bet.coinsEarned || 0), 0);

		return json({
			success: true,
			bets: unrewardedBets,
			totalCoins
		});
	} catch (error) {
		console.error('Error fetching unrewarded bets:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to fetch unrewarded bets'
			},
			{ status: 500 }
		);
	}
}
