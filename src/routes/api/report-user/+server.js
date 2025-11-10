import { json } from '@sveltejs/kit';
import { base } from '$lib/server/db.js';

export async function POST({ request, locals }) {
	if (!locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const { targetUserId, description } = await request.json();

		// Validation
		if (!targetUserId || !description) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// SECURITY: Validate userId format (Airtable record IDs start with 'rec')
		if (!/^rec[a-zA-Z0-9]{14}$/.test(targetUserId)) {
			return json({ error: 'Invalid user ID format' }, { status: 400 });
		}

		// SECURITY: Prevent users from reporting themselves
		if (targetUserId === locals.user.recId) {
			return json({ error: 'Cannot report yourself' }, { status: 400 });
		}

		const sanitizedDescription = String(description).trim();
		if (sanitizedDescription.length < 10) {
			return json({ error: 'Description must be at least 10 characters' }, { status: 400 });
		}
		if (sanitizedDescription.length > 300) {
			return json({ error: 'Description must be less than 300 characters' }, { status: 400 });
		}

		let targetUserRecord;
		try {
			targetUserRecord = await base('User').find(targetUserId);
		} catch {
			return json({ error: 'User not found' }, { status: 404 });
		}

		// Get existing reports
		let existingReports = [];
		if (targetUserRecord.fields.reports) {
			try {
				existingReports = JSON.parse(targetUserRecord.fields.reports);
				if (!Array.isArray(existingReports)) {
					existingReports = [];
				}
			} catch (parseError) {
				console.warn('Failed to parse reports JSON, resetting to empty array:', parseError);
				existingReports = [];
			}
		}

		// SECURITY: Rate limiting - check if user has already reported this user in the last 24 hours
		const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const recentReportFromUser = existingReports.find(
			(report) =>
				report.reporterId === locals.user.recId && new Date(report.timestamp) > twentyFourHoursAgo
		);

		if (recentReportFromUser) {
			return json(
				{ error: 'You have already reported this user recently. Please wait 24 hours.' },
				{ status: 429 }
			);
		}

		let nextId = 1;
		if (existingReports.length > 0) {
			const ids = existingReports.map((r) => r.id || 0);
			const maxId = Math.max(...ids);
			nextId = maxId + 1;
		}

		// Create new report
		const newReport = {
			id: nextId,
			reporterId: locals.user.recId,
			reporterUsername: locals.user.username,
			description: sanitizedDescription,
			timestamp: new Date().toISOString()
		};

		const updatedReports = [...existingReports, newReport];

		await base('User').update(targetUserId, {
			reports: JSON.stringify(updatedReports)
		});

		return json({
			success: true,
			message: 'Report submitted successfully.'
		});
	} catch (error) {
		console.error('Error submitting report:', error);
		return json({ error: 'Failed to submit report' }, { status: 500 });
	}
}
