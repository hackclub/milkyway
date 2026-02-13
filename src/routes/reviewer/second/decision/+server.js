import { json } from '@sveltejs/kit';
import { getReviewerPermissions, submitSecondDecision } from '$lib/server/reviewer.js';

export async function POST({ request, locals }) {
  try {
    if (!locals.user) return json({ ok: false, error: 'Not logged in' }, { status: 401 });

    const perms = await getReviewerPermissions(locals.user.recId);
    if (!perms.includes('Second')) return json({ ok: false, error: 'No permission' }, { status: 403 });

    const { projectId, action } = await request.json();
    const reviewerId = locals.user.recId;

    const result = await submitSecondDecision({ projectId, reviewerId, action });
    return json(result);
  } catch (e) {
    console.error('second decision error', e);
    return json({ ok: false, error: e.message ?? 'Unknown error' }, { status: 500 });
  }
}
