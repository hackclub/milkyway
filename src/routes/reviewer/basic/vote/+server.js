import { json } from '@sveltejs/kit';
import { submitBasicVote } from '$lib/server/reviewer.js';

export async function POST({ request, locals }) {
  try {
    if (!locals.user) {
      return json({ ok: false, error: 'Not logged in' }, { status: 401 });
    }

    const { projectId, vote } = await request.json();
    const reviewerId = locals.user.recId;

    const result = await submitBasicVote({ projectId, reviewerId, vote });
    return json(result);
  } catch (e) {
    console.error('basic vote error', e);
    const msg = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: msg }, { status: 500 });
  }
}
