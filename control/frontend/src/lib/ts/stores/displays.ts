import { get, writable, type Writable } from 'svelte/store';
import type {
	Display,
	DisplayGroup,
	DisplayIdGroup,
	DisplayIdObject,
	DisplayStatus
} from '../types';
import { is_selected, select, selected_display_ids } from './select';
import { get_uuid, image_content_hash } from '../utils';
import { get_screenshot } from '../api_handler';
import { delete_and_deselect_unique_files_from_display } from './files';
import { db } from '../database';
import { dev } from '$app/environment';

export const local_displays: Writable<DisplayIdGroup[]> = writable<DisplayIdGroup[]>([]);

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
	} else {
		group_id = get_uuid();
		await db.display_groups.put({ id: group_id, position: 0 });
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

export async function set_select_for_group(display_group_id: string, new_value: boolean) {
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

export async function run_on_all_selected_displays(
	run_function: (display: Display) => void | Promise<void>,
	update_screenshot_afterwards: boolean = true,
	ignore_offline: boolean = true
) {
	const maybe_displays: (Display | null)[] = await Promise.all(
		// fails when only a single promis fails
		get(selected_display_ids).map(async (id) => await get_display_by_id(id))
	);
	const displays: Display[] = maybe_displays.filter((d): d is Display => d !== null);

	Promise.all(
		displays.map(async (display) => {
			if (!display || (ignore_offline && display.status === 'host_offline')) return;
			await run_function(display);
			if (update_screenshot_afterwards) {
				await screenshot_loop(display.id);
			}
		})
	);
}

export async function get_display_groups(): Promise<DisplayGroup[]> {
	return await db.display_groups.orderBy('position').toArray();
}

export async function update_local_displays() {
	const display_groups = await db.display_groups.orderBy('position').toArray();
	const displays = await db.displays.orderBy('position').toArray();
	const out: DisplayIdGroup[] = [];
	for (const group of display_groups) {
		out.push({
			id: group.id,
			displays: (await displays).filter((d) => d.group_id === group.id).map((d) => ({ id: d.id }))
		});
	}
	return out;
}

export async function update_db_displays() {
	// local_displays.update((groups) => groups.filter((g) => g.displays.length !== 0));
	const filtered_local_display_groups = get(local_displays)
	// .filter(
	// 	(group) => group.displays.length !== 0
	// );
	// local_displays.set(filtered_local_display_groups);
	const db_display_group_ids = (await db.display_groups.toArray()).map((group) => group.id);
	console.log('JOJ', filtered_local_display_groups, db_display_group_ids);
	const local_display_group_ids = filtered_local_display_groups.map((group) => group.id);

	const display_group_ids_to_delete = db_display_group_ids.filter(
		(group) => !local_display_group_ids.includes(group)
	);
	await db.display_groups.where('id').anyOf(display_group_ids_to_delete).delete();

	for (let i = 0; i < filtered_local_display_groups.length; i++) {
		const group = filtered_local_display_groups[i];
		if (db_display_group_ids.includes(group.id)) {
			await db.display_groups.update(group.id, { position: i });
		} else {
			await db.display_groups.put({
				id: group.id,
				position: i
			});
		}

		for (let j = 0; j < group.displays.length; j++) {
			const display_id = group.displays[j].id;
			await db.displays.update(display_id, { position: j, group_id: group.id });
		}
	}
}

export function set_new_display_order(display_id_group_id: string, new_data: DisplayIdObject[]) {
	local_displays.update((local_displays: DisplayIdGroup[]) => {
		for (const display_id_group of local_displays) {
			if (display_id_group.id === display_id_group_id) {
				display_id_group.displays = new_data;
			}
		}
		return local_displays;
	});
}

if (dev) {
	setTimeout(add_testing_displays, 0);
	async function add_testing_displays() {
		await add_display('127.0.0.1', '00:1A:2B:3C:4D:5E', 'PC', 'host_offline');
		// await add_display("192.168.178.111", "D4:81:D7:C0:DF:3C", "Laptop", "host_offline");
	}
}
