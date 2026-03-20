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

		// Get the project's primary identifier (projectid field) for fallback matching.
		const { base: projectsBase } = await import('$lib/server/db.js');
		const projectRecord = await projectsBase('Projects').find(projectId);
		const projectPrimaryId = projectRecord.fields.projectid;

		// Get candidate unrewarded bets for this user, then strictly match attached project in JS.
		const betsTable = base('Bets');
		const escapedUserEmail = escapeAirtableFormula(
			typeof userInfo.email === 'string' ? userInfo.email : ''
		);
		let betRecords = await betsTable
			.select({
				filterByFormula: `AND(
					FIND("|${escapedUserEmail}|", "|" & ARRAYJOIN({user}, "|") & "|") > 0,
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

		const unrewardedBets = betRecords
			.filter((bet) => {
				const betUserField = bet.fields.user;
				const betUserIds = Array.isArray(betUserField)
					? betUserField
					: betUserField
						? [String(betUserField)]
						: [];
				if (!betUserIds.includes(userInfo.recId)) {
					return false;
				}

				const attachedProjects = Array.isArray(bet.fields.attachedProject)
					? bet.fields.attachedProject.map((entry) => String(entry))
					: bet.fields.attachedProject
						? [String(bet.fields.attachedProject)]
						: [];

				return (
					attachedProjects.includes(projectId) ||
					(Boolean(projectPrimaryId) && attachedProjects.includes(String(projectPrimaryId)))
				);
			})
			.map((bet) => {
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
