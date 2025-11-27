import { json } from '@sveltejs/kit';
import {
	getUserInfoBySessionId,
	getUserInfoByUsername,
	sanitizeUserForFrontend,
	sanitizeUserForPublic
} from '$lib/server/auth.js';
import { base } from '$lib/server/db.js';
import {
	escapeAirtableFormula,
	checkRateLimit,
	getClientIdentifier
} from '$lib/server/security.js';

export async function GET({ cookies, url, request }) {
	try {
		// Rate limiting: 60 requests per minute per client to prevent enumeration attacks
		const clientId = getClientIdentifier(request, cookies);
		if (!checkRateLimit(`user-profile:${clientId}`, 60, 60000)) {
			return json(
				{
					success: false,
					error: 'Too many requests. Please try again later.'
				},
				{ status: 429 }
			);
		}

		const username = url.searchParams.get('username');
		const sessionId = cookies.get('sessionid');

		let userInfo;
		let projects = [];
		let furniture = [];
		let isFollowing = false;
		let followerCount = 0;
		let followingCount = 0;

		if (username) {
			// Fetch specific user by username
			userInfo = await getUserInfoByUsername(username);
			if (!userInfo) {
				return json({ success: false, error: 'User not found' }, { status: 404 });
			}

			// SECURITY: Sanitize user data for public viewing (removes email, address, idv, coins, etc.)
			const publicUserInfo = sanitizeUserForPublic(userInfo);

			// Fetch user's projects
			const escapedUserId = escapeAirtableFormula(userInfo.recId);
			const projectRecords = await base('Projects')
				.select({
					filterByFormula: `{user} = "${escapedUserId}"`,
					sort: [{ field: 'Created', direction: 'desc' }]
				})
				.all();

			projects = projectRecords.map((record) => ({
				id: record.id,
				...record.fields
			}));

			// Fetch user's furniture
			const furnitureRecords = await base('Furniture')
				.select({
					filterByFormula: `{user} = "${escapedUserId}"`
				})
				.all();

			furniture = furnitureRecords.map((record) => {
				const fields = record.fields;
				const position = fields.position || 'inventory';
				const [x, y, flipped] =
					position === 'inventory' ? [0, 0, 0] : String(position).split(',').map(Number);

				return {
					id: record.id,
					type: fields.type,
					position: position,
					x: x || 0,
					y: y || 0,
					flipped: flipped === 1,
					isPlaced: position !== 'inventory'
				};
			});

			// Get follower/following counts
			const followersRecords = await base('Followers')
				.select({
					filterByFormula: `{following} = "${escapedUserId}"`
				})
				.all();
			followerCount = followersRecords.length;

			const followingRecords = await base('Followers')
				.select({
					filterByFormula: `{follower} = "${escapedUserId}"`
				})
				.all();
			followingCount = followingRecords.length;

			// Check if current user is following this user
			if (sessionId) {
				const currentUserInfo = await getUserInfoBySessionId(sessionId);
				if (currentUserInfo) {
					const escapedCurrentUserId = escapeAirtableFormula(currentUserInfo.recId);
					const followRecord = await base('Followers')
						.select({
							filterByFormula: `AND({follower} = "${escapedCurrentUserId}", {following} = "${escapedUserId}")`,
							maxRecords: 1
						})
						.firstPage();
					isFollowing = followRecord.length > 0;
				}
			}

			return json({
				success: true,
				user: {
					...publicUserInfo,
					followerCount,
					followingCount
				},
				projects,
				furniture,
				isFollowing
			});
		} else {
			// Fetch current authenticated user
			if (!sessionId) {
				return json({ success: false, error: 'Not authenticated' }, { status: 401 });
			}

			userInfo = await getUserInfoBySessionId(sessionId);
			if (!userInfo) {
				return json({ success: false, error: 'User not found' }, { status: 404 });
			}

			const user = sanitizeUserForFrontend(userInfo);

			return json({
				success: true,
				user
			});
		}
	} catch (err) {
		console.error('Error fetching user profile:', err);
		const errorMessage = err instanceof Error ? err.message : 'Failed to get user profile';

		return json(
			{
				success: false,
				error: { message: errorMessage }
			},
			{ status: 500 }
		);
	}
}
