import { start_screenshot_loop } from './stores/displays';
import { ping_ip } from './api_handler';
import type { Display } from './types';
import { update_folder_elements_recursively } from './stores/files';
import { db } from './files_display.db';

const update_display_status_interval_seconds = 20;

export async function on_start() {
	await db.files.clear();
	await db.files_on_display.clear();
	await update_all_display_status();
	await setInterval(update_all_display_status, update_display_status_interval_seconds * 1000);
}

async function update_all_display_status() {
	const all_displays: Display[] = await db.displays.toArray();
	for (const display of all_displays) {
		const new_status = await ping_ip(display.ip);
		if (new_status === null && display.status !== null) continue;
		if (new_status === 'app_online' && display.status !== 'app_online') {
			await on_display_start(display);
		}
		if (new_status !== display.status) {
			display.status = new_status;
			await db.displays.put(display); // save
		}
	}
	console.debug('Display Status updated');
}

async function on_display_start(display: Display) {
	await update_folder_elements_recursively(display, '/');
	await start_screenshot_loop(display.id);
}
