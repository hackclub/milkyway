import { json } from '@sveltejs/kit';
import { getUserInfoBySessionId } from '$lib/server/auth.js';
import { base } from '$lib/server/db.js';
import { checkRateLimit, getClientIdentifier, sanitizeErrorMessage } from '$lib/server/security.js';
import { validateComment } from '$lib/server/validation.js';

// POST - Add a comment to a devlog
export async function POST({ locals, cookies, request }) {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Rate limiting: 10 comments per minute per user
		const clientId = getClientIdentifier(request, cookies);
		if (!checkRateLimit(`devlog-comment:${clientId}`, 10, 60000)) {
			return json(
				{
					success: false,
					error: 'Too many comments. Please slow down.'
				},
				{ status: 429 }
			);
		}

		const userInfo = await getUserInfoBySessionId(cookies.get('sessionid'));
		if (!userInfo) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		const body = await request.json();
		const { devlogId, content } = body;

		if (!devlogId || typeof devlogId !== 'string') {
			return json({ success: false, error: 'Devlog ID is required' }, { status: 400 });
		}

		// Validate comment content
		const commentValidation = validateComment(content);
		if (!commentValidation.valid) {
			return json({ success: false, error: commentValidation.error }, { status: 400 });
		}

		const devlogRecord = await base('Devlogs').find(devlogId);
		if (!devlogRecord) {
			return json({ success: false, error: 'Devlog not found' }, { status: 404 });
		}

		let comments = [];
		if (devlogRecord.fields.comments) {
			try {
				comments = JSON.parse(devlogRecord.fields.comments);
				if (!Array.isArray(comments)) {
					comments = [];
				}
			} catch (e) {
				console.error('Failed to parse existing comments:', e);
				comments = [];
			}
		}

		const newComment = {
			username: userInfo.username,
			userId: userInfo.recId,
			content: content.trim(),
			created: new Date().toISOString()
		};

		comments.push(newComment);

		await base('Devlogs').update(devlogId, {
			comments: JSON.stringify(comments)
		});

		return json({
			success: true,
			comment: newComment,
			totalComments: comments.length
		});
	} catch (err) {
		console.error('Error adding devlog comment:', err);
		const errorMessage = sanitizeErrorMessage(
			err instanceof Error ? err.message : 'Failed to add comment'
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
