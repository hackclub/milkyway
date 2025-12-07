
import { json, error } from '@sveltejs/kit';
import { blackholeModerateSchema, approveBlackholeSubmission } from '$lib/server/blackhole.js';

export async function POST({ request }) {
    let body;
    try {
        body = await request.json();
    } catch {
        throw error(400, 'Invalid JSON');
    }

    let input;
    try {
        input = blackholeModerateSchema
            .omit({ reason: true })
            .parse(body);
    } catch (err) {
        console.error('Zod error in /blackhole/approve:', err);
        throw error(400, 'Invalid input');
    }

    try {
        const updated = await approveBlackholeSubmission(input);
        return json(updated);
    } catch (err) {
        console.error('Blackhole approve error', err);
        const msg = err instanceof Error ? err.message : 'Failed to approve submission'
        throw error(400, msg);
    }
}

//saving this in case i am idiot

// import { json, error } from '@sveltejs/kit';
// import { z } from 'zod';
// import { setSubmissionStatus, getSubmissionById } from '$lib/server/blackhole';
// import { base } from '$lib/server/db.js';

// const Body = z.object({ submissionId: z.string().min(1)});

// /** @typedef {{ id?: string; email?: string; role?: 'admin'|'user' }} User */
// /** @param {User | null | undefined} user */

// function isAdmin(user) {
//     return !!user && user.role === 'admin'|| user?.email?.endsWith('@hackclub.com');
// }

// export async function POST({ locals, request }) {
//     if (!locals.user) throw error(401, 'sign in required');
//     // Need add admin check, don't do now since I'm not admin
//     if (!isAdmin(locals.user)) throw error(403, 'Admins only');

//     const { submissionId } =  Body.parse(await request.json());
//     const sub = await getSubmissionById(submissionId);
//     if (!sub) throw error(404, 'Submission not found');

//     await setSubmissionStatus(submissionId, 'approved');

//     const userRecId = sub.user?.[0];
//     if (userRecId) {
//         const user = await base('User').find(userRecId);
//         const ships = Number(user.fields.stellarships ?? 0) + 1;
//         await base('User').update(userRecId, { stellarships: ships });
//     }

//     return json({ ok:true })
// }