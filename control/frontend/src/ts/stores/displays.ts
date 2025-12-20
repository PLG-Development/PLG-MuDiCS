import { get } from 'svelte/store';
import type { Display, DisplayGroup, DisplayStatus } from '../types';
import { is_selected, select, selected_display_ids } from './select';
import { get_uuid, image_content_hash } from '../utils';
import { get_screenshot } from '../api_handler';
import { delete_and_deselect_unique_files_from_display } from './files';
import { db } from '../files_display.db';

// export const displays: Writable<DisplayGroup[]> = writable<DisplayGroup[]>([{
//     id: get_uuid(),
//     data: []
// }]);

export async function is_display_name_taken(name: string): Promise<boolean> {
	const exists = await db.displays.where('name').equals(name).first();
	return !!exists;
}

export async function add_display(
	ip: string,
	mac: string | null,
	name: string,
	status: DisplayStatus
) {
	if (await is_display_name_taken(name)) return;
	const new_id = get_uuid();
	const group = await db.display_groups.toCollection().first();
	let group_id: string;
	if (group) {
		group_id = group.id;
		console.log('DISPLAYGROUP WURDE NICHT ERSTELLT');
	} else {
		group_id = get_uuid();
		await db.display_groups.put({ id: group_id, position: 0 });
		console.log('DISPLAYGROUP WURDE ERSTELLT');
	}
	const element_count_in_group = (await db.displays.where('group_id').equals(group_id).toArray())
		.length;
	await db.displays.put({
		id: new_id,
		ip,
		mac,
		position: element_count_in_group,
		preview: { currently_updating: false, url: null },
		group_id: group_id,
		name,
		status
	});
}

export async function edit_display_data(
	display_id: string,
	ip: string,
	mac: string | null,
	name: string
) {
	let display = await db.displays.get(display_id);
	if (!display) return;
	display = { ...display, ip: ip, mac: mac, name: name };
	await db.displays.put(display); // save
}

export async function remove_display(display_id: string) {
	select(selected_display_ids, display_id, 'deselect');
	await delete_and_deselect_unique_files_from_display(display_id);

	const group_id = (await db.displays.get(display_id))?.group_id;
	await db.displays.delete(display_id);
	if (group_id && (await db.displays.where('group_id').equals(group_id).toArray()).length === 0) {
		await db.display_groups.delete(group_id); // delete empty group
	}
}

export async function all_displays_of_group_selected(
	display_group_id: string,
	current_selected_displays: string[]
): Promise<boolean> {
	const displays_of_group: Display[] = await db.displays
		.where('group_id')
		.equals(display_group_id)
		.toArray();
	if (displays_of_group.length === 0) return false;

	for (const display of displays_of_group) {
		if (!is_selected(display.id, current_selected_displays)) {
			return false;
		}
	}
	return true;
}

export async function select_all_of_group(
	display_group_id: string,
	new_value: boolean | null = null
) {
	const displays_of_group: Display[] = await db.displays
		.where('group_id')
		.equals(display_group_id)
		.toArray();
	for (const display of displays_of_group) {
		let action: string;
		if (new_value === true) {
			action = 'select';
		} else {
			action = 'deselect';
		}

		select(selected_display_ids, display.id, action as 'toggle' | 'select' | 'deselect');
	}
}

export async function get_display_by_id(display_id: string): Promise<Display | null> {
	return (await db.displays.get(display_id)) ?? null;
}

export async function screenshot_loop(display_id: string, initial_retry_count: number = 5) {
	const display = await db.displays.get(display_id);
	if (!display || display.preview.currently_updating) return;

	display.preview.currently_updating = true;
	await db.displays.update(display.id, { preview: display.preview });

	let last_hash: number | null = null;

	let retry_count = initial_retry_count;
	while (retry_count > 0) {
		retry_count -= 1;

		const new_blob = await get_screenshot(display.ip);
		if (!new_blob) {
			display.preview = { currently_updating: false, url: null };
			await db.displays.update(display.id, { preview: display.preview });
			return;
		}
		const new_hash = await image_content_hash(new_blob);
		if (last_hash !== new_hash) {
			if (display.preview.url) {
				URL.revokeObjectURL(display.preview.url);
			}

			last_hash = new_hash;
			display.preview.url = URL.createObjectURL(new_blob);
			await db.displays.update(display.id, { preview: display.preview });

			retry_count = initial_retry_count;
		}

		await new Promise((resolve) => setTimeout(resolve, 2000)); // sleep 2s
	}

	display.preview.currently_updating = false;
	await db.displays.update(display.id, { preview: display.preview });
}

export async function run_on_all_selected_displays<T extends unknown[]>(
	run_function: (ip: string, ...args: T) => void | Promise<void>,
	update_screenshot_afterwards: boolean,
	...args: T
) {
	for (const display_id of get(selected_display_ids)) {
		const display_ip = (await get_display_by_id(display_id))?.ip;
		if (display_ip) {
			await run_function(display_ip, ...args);
			if (update_screenshot_afterwards) {
				await screenshot_loop(display_id);
			}
		}
	}
}

export async function get_display_groups(): Promise<DisplayGroup[]> {
	return await db.display_groups.orderBy('position').toArray();
}

export async function get_display_ids_in_group(display_group_id: string): Promise<Display[]> {
	const displays: Display[] = await db.displays
		.where('group_id')
		.equals(display_group_id)
		.sortBy('position');
	return displays;
}

export async function set_new_display_order(new_ordered_items: Display[]) {
	for (let i = 0; i < new_ordered_items.length; i++) {
		new_ordered_items[i].position = i;
		await db.displays.put(new_ordered_items[i]);
	}
}

export async function set_new_display_group_order(new_ordered_items: DisplayGroup[]) {
	for (let i = 0; i < new_ordered_items.length; i++) {
		new_ordered_items[i].position = i;
		await db.display_groups.put(new_ordered_items[i]);
	}
}

setTimeout(add_testing_displays, 0);
async function add_testing_displays() {
	await add_display('127.0.0.1', '00:1A:2B:3C:4D:5E', 'PC', 'host_offline');
	// await add_display("192.168.178.111", "D4:81:D7:C0:DF:3C", "Laptop", "host_offline");
}
