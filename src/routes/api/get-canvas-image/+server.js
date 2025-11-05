import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';

export async function POST({ locals, request }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = await request.json();

	const furnitureRecord = await base('Furniture').find(id);

	if (!furnitureRecord) {
		return json({ error: 'Furniture not found' }, { status: 404 });
	}

	try {
		await base('Furniture').update(id, {
			data: JSON.stringify({
				name: JSON.parse(furnitureRecord.fields.data).name,
				url: furnitureRecord.fields.attachment[0].url
			})
		});
		return json({ url: furnitureRecord.fields.attachment[0].url });
	} catch (error) {
		console.log('Failed to update furniture data: ' + error);
		return json({ error: 'Failed to update furniture data' }, { status: 500 });
	}
}
