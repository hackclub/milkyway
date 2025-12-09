import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { verifyProjectOwnership } from '$lib/server/projects.js';
import { checkRateLimit, getClientIdentifier, escapeAirtableFormula } from '$lib/server/security.js';

export async function POST({ request, cookies }) {
	try {
		// Get user info from session
		const sessionId = cookies.get('sessionid');
		const userInfo = await getUserInfoBySessionId(sessionId || '');

		if (!userInfo) {
			return json(
				{
					success: false,
					error: { message: 'Authentication required' }
				},
				{ status: 401 }
			);
		}

		// Rate limiting: 10 claims per minute
		const clientId = getClientIdentifier(request, cookies);
		if (!checkRateLimit(`paint-chips-claim:${clientId}`, 10, 60000)) {
			return json({ success: false, error: { message: 'Too many requests' } }, { status: 429 });
		}

		const { projectId, paintChips } = await request.json();

		if (!projectId) {
			return json(
				{
					success: false,
					error: { message: 'Project ID required' }
				},
				{ status: 400 }
			);
		}

		if (!paintChips || typeof paintChips !== 'number' || paintChips <= 0) {
			return json(
				{
					success: false,
					error: { message: 'Invalid paint chips amount' }
				},
				{ status: 400 }
			);
		}

		// Verify project ownership
		const isOwner = await verifyProjectOwnership(projectId, String(userInfo.email));
		if (!isOwner) {
			return json(
				{
					success: false,
					error: { message: 'Forbidden' }
				},
				{ status: 403 }
			);
		}

		// Get the project to validate claim
		const projectsTable = base('Projects');
		const projectRecord = await projectsTable.find(projectId);
		const projectData = projectRecord.fields;

		// Verify project is shipped
		if (projectData.status !== 'submitted') {
			return json(
				{
					success: false,
					error: { message: 'Project must be shipped first' }
				},
				{ status: 400 }
			);
		}

		// Calculate actual claimable paint chips server-side
		// Total chips = total hours * 5 (for all shipped projects)
		const hackatimeHours = typeof projectData.hackatimeHours === 'number' ? projectData.hackatimeHours : 0;
		const artHours = typeof projectData.artHours === 'number' ? projectData.artHours : 0;
		const currentTotal = hackatimeHours + artHours;
		const paintChipsClaimed = typeof projectData.paintChipsClaimed === 'number' ? projectData.paintChipsClaimed : 0;

		// Calculate total earned (5 per hour worked)
		const totalEarned = Math.floor(currentTotal * 5);
		const actualClaimable = Math.max(0, totalEarned - paintChipsClaimed);

		// Validate claim amount
		if (paintChips > actualClaimable) {
			return json(
				{
					success: false,
					error: { message: `You can only claim ${actualClaimable} paint chips` }
				},
				{ status: 400 }
			);
		}

		// Update project paintChipsClaimed
		await projectsTable.update(projectRecord.id, {
			paintChipsClaimed: paintChipsClaimed + paintChips
		});

		// Update user's paintchips
		const usersTable = base('User');
		let userRecord = null;

		try {
			userRecord = await usersTable.find(userInfo.recId);
		} catch (userLookupError) {
			console.error('Failed to fetch user by record ID:', userLookupError);
			try {
				const fallbackRecords = await usersTable
					.select({
						filterByFormula: `{email} = "${escapeAirtableFormula(
							typeof userInfo.email === 'string' ? userInfo.email : ''
						)}"`
					})
					.firstPage();
				if (fallbackRecords.length > 0) {
					userRecord = fallbackRecords[0];
				}
			} catch (fallbackError) {
				console.error('Failed to fetch user by email fallback:', fallbackError);
			}
		}

		if (userRecord) {
			const currentPaintChips =
				typeof userRecord.fields.paintchips === 'number' ? userRecord.fields.paintchips : 0;
			await usersTable.update(userRecord.id, {
				paintchips: currentPaintChips + paintChips
			});
		}

		return json({
			success: true,
			message: `Claimed ${paintChips} paint chips!`,
			paintChipsClaimed: paintChipsClaimed + paintChips
		});
	} catch (error) {
		console.error('Error claiming paint chips:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to claim paint chips';

		return json(
			{
				success: false,
				error: { message: errorMessage }
			},
			{ status: 500 }
		);
	}
}
