import { json } from '@sveltejs/kit';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { base } from '$lib/server/db.js';
import { checkRateLimit, getClientIdentifier, sanitizeErrorMessage } from '$lib/server/security.js';

// POST - Toggle like on a devlog
export async function POST({ locals, cookies, request }) {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Rate limiting: 50 likes per minute per user
		const clientId = getClientIdentifier(request, cookies);
		if (!checkRateLimit(`devlog-like:${clientId}`, 50, 60000)) {
			return json(
				{
					success: false,
					error: 'Too many requests. Please slow down.'
				},
				{ status: 429 }
			);
		}

		const userInfo = await getUserInfoBySessionId(cookies.get('sessionid'));
		if (!userInfo) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		const body = await request.json();
		const { devlogId } = body;

		if (!devlogId || typeof devlogId !== 'string') {
			return json({ success: false, error: 'Devlog ID is required' }, { status: 400 });
		}

		const devlogRecord = await base('Devlogs').find(devlogId);
		if (!devlogRecord) {
			return json({ success: false, error: 'Devlog not found' }, { status: 404 });
		}

		let likes = [];
		if (devlogRecord.fields.likes) {
			try {
				likes = JSON.parse(devlogRecord.fields.likes);
				if (!Array.isArray(likes)) {
					likes = [];
				}
			} catch (e) {
				console.error('Failed to parse existing likes:', e);
				likes = [];
			}
		}

		// Check if user already liked this devlog
		const userLikeIndex = likes.findIndex((like) => like.userId === userInfo.recId);
		let isLiked = false;

		if (userLikeIndex !== -1) {
			likes.splice(userLikeIndex, 1);
			isLiked = false;
		} else {
			likes.push({
				userId: userInfo.recId,
				username: userInfo.username,
				created: new Date().toISOString()
			});
			isLiked = true;
		}

		await base('Devlogs').update(devlogId, {
			likes: JSON.stringify(likes)
		});

		return json({
			success: true,
			isLiked: isLiked,
			likeCount: likes.length
		});
	} catch (err) {
		console.error('Error toggling devlog like:', err);
		const errorMessage = sanitizeErrorMessage(
			err instanceof Error ? err.message : 'Failed to toggle like'
		);

		return json(
			{
				success: false,
				error: errorMessage
			},
			{ status: 500 }
		);
	}
}
