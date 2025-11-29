// well uhh its the user submissions here

import {json, error} from '@sveltejs/kit';
import { getMyBlackholeSubmissions } from '$lib/server/blackhole.js';

export async function GET({ url }) {
    const username = url.searchParams.get('username');

    if (!username) {
        throw error(400, 'Missing username');
    }

    try {
        const submissions = await getMyBlackholeSubmissions(username);
        return json(submissions);
    } catch (err) {
        console.error('my submissions error, fix it ya bumb', err);
        throw error(500, 'Failed to fetch submissions');
    }
}