import { json } from '@sveltejs/kit';
import crypto from 'crypto';

export function GET({ cookies }) {
	let sessionId = '';
	try {
		if (cookies) {
			sessionId = cookies.get('sessionid') || '';
		}
	} catch {}

	if (!sessionId) {
		return json(
			{ sessionId: '', masked: '' },
			{
				headers: {
					'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
					Pragma: 'no-cache',
					Expires: '0'
				}
			}
		);
	}

	const masked =
		sessionId.length > 8 ? `${sessionId.slice(0, 4)}…${sessionId.slice(-4)}` : sessionId;
	const hash = crypto.createHash('sha256').update(sessionId).digest('hex').slice(0, 16);

	return json(
		{ sessionId, masked, hash: `sha256:${hash}` },
		{
			headers: {
				'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
				Pragma: 'no-cache',
				Expires: '0'
			}
		}
	);
}
