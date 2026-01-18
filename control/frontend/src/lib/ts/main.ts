import { screenshot_loop } from './stores/displays';
import { ping_ip } from './api_handler';
import type { Display, DisplayStatus } from './types';
import { update_folder_elements_recursively } from './stores/files';
import { db } from './database';

const update_display_status_interval_seconds = 20;
const update_display_loading_status_interval_seconds = 2;

const loading_display_ids: string[] = [];

export async function on_app_start() {
	await db.files.clear();
	await db.files_on_display.clear();
	await db.displays.toCollection().modify({ status: null });
	await update_all_display_status(false);
	await setInterval(
		() => update_all_display_status(false),
		update_display_status_interval_seconds * 1000
	);
	await setInterval(
		() => update_all_display_status(true),
		update_display_loading_status_interval_seconds * 1000
	);
}

async function update_all_display_status(only_loading_displays: boolean) {
	const not_loading_displays: Display[] = await db.displays
		.filter((d) =>
			only_loading_displays
				? loading_display_ids.includes(d.id)
				: !loading_display_ids.includes(d.id)
		)
		.toArray();
	for (const display of not_loading_displays) {
		await update_display_status(display);
	}
}

export async function update_display_status(display: Display): Promise<DisplayStatus> {
	const new_status = await ping_ip(display.ip);
	if (new_status === null && display.status !== null) return null;
	if (new_status !== display.status) {
		// status change
		if (new_status === 'app_offline') {
			loading_display_ids.push(display.id);
		} else {
			remove_display_from_loading_displays(display.id);
			if (new_status === 'app_online') {
				on_display_start(display);
			}
		}
		display.status = new_status;
		await db.displays.put(display); // save
	}
	return new_status;
}

export function remove_display_from_loading_displays(display_id: string) {
	const index = loading_display_ids.indexOf(display_id);
	if (index !== -1) {
		loading_display_ids.splice(index, 1);
	}
}

async function on_display_start(display: Display) {
	await update_folder_elements_recursively(display, '/');
	await screenshot_loop(display.id);
}
