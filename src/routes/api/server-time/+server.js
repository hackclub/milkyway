import { json } from '@sveltejs/kit';

// Returns server current time and midnight boundaries based on server local timezone
export async function GET() {
	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const nextDayStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

	return json({
		serverTime: now.toISOString(),
		serverTimestamp: now.getTime(),
		todayStart: todayStart.toISOString(),
		nextDayStart: nextDayStart.toISOString(),
		serverTimezoneOffsetMinutes: now.getTimezoneOffset() // minutes offset from UTC
	});
}
