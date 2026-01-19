import { get, writable, type Writable } from 'svelte/store';
import {
	get_file_primary_key,
	is_folder,
	type Display,
	type FileOnDisplay,
	type Inode,
	type TreeElement
} from '../types';
import { get_display_by_id } from './displays';
import { is_selected, select, selected_display_ids, selected_file_ids } from './select';
import { create_path, get_file_data, get_file_tree_data } from '../api_handler';
import { deactivate_old_thumbnail_urls, generate_thumbnail } from './thumbnails';
import { db } from '../database';
import { file_transfer_tasks } from '../file_transfer_handler';

export const current_file_path: Writable<string> = writable<string>('/');

export async function change_file_path(new_path: string) {
	current_file_path.update(() => {
		return new_path;
	});
	selected_file_ids.update(() => {
		return [];
	});

	deactivate_old_thumbnail_urls();

	const displays = await db.displays.toArray();

	for (const display of displays) {
		const changed_paths = await get_changed_directory_paths(display, new_path);
		if (!changed_paths) continue;
		console.debug('Update file system from', display.name, ':', changed_paths);
		for (const path of changed_paths) {
			await update_folder_elements_recursively(display, path);
		}
	}
}

export async function delete_and_deselect_unique_files_from_display(display_id: string) {
	const files_on_display = await db.files_on_display
		.where('display_id')
		.equals(display_id)
		.toArray();
	for (const file of files_on_display) {
		await remove_file_from_display_recusively(display_id, file.file_primary_key);
	}
	await remove_all_files_without_display();
}

export async function remove_file_from_display_recusively(
	display_id: string,
	file_primary_key: string
) {
	const found = await db.files_on_display.get([display_id, file_primary_key]);
	if (!found) return;
	select(selected_file_ids, file_primary_key, 'deselect');
	await db.files_on_display.delete([display_id, file_primary_key]);

	const inode_element = await get_file_by_id(found.file_primary_key);
	if (!inode_element) return;
	if (is_folder(inode_element)) {
		const path_inside_folder = inode_element.path + inode_element.name + `/`;
		const primary_file_keys_in_folder = (
			await db.files.where('path').equals(path_inside_folder).toArray()
		).map((e) => get_file_primary_key(e));
		const primary_file_keys_in_folder_on_display = (
			await db.files_on_display
				.where('file_primary_key')
				.anyOf(primary_file_keys_in_folder)
				.filter((file) => file.display_id === display_id)
				.toArray()
		).map((e) => e.file_primary_key);
		for (const file_key of primary_file_keys_in_folder_on_display) {
			await remove_file_from_display_recusively(display_id, file_key);
		}
	}
}

export async function remove_all_files_without_display() {
	const existing_file_id_strings: string[] = (await db.files_on_display
		.orderBy('file_primary_key')
		.uniqueKeys()) as string[];
	const existing_file_id_objects: [string, string, number, string][] = existing_file_id_strings.map(
		(e) => JSON.parse(e) as [string, string, number, string]
	);
	await db.files.where('[path+name+size+type]').noneOf(existing_file_id_objects).delete();
}

export async function update_current_folder_on_selected_displays() {
	selected_file_ids.update(() => {
		return [];
	});
	const current_path = get(current_file_path);

	for (const display of await db.displays.where('id').anyOf(get(selected_display_ids)).toArray()) {
		await update_folder_elements_recursively(display, current_path);
	}
}

export async function get_missing_colliding_display_ids(
	file: Inode,
	selected_display_ids: string[]
): Promise<{ missing: string[]; colliding: string[] }> {
	const missing: string[] = await get_display_ids_where_file_is_missing(file, selected_display_ids);

	const colliding: string[] = [];
	const colliding_files = await db.files
		.where('[path+name]')
		.equals([file.path, file.name])
		.filter((e) => e.size !== file.size || e.type !== file.type)
		.toArray();
	for (const colliding_file of colliding_files) {
		colliding.push(
			...(await get_display_ids_where_file_is_missing(colliding_file, selected_display_ids))
		);
	}

	return { missing, colliding };
}

async function get_display_ids_where_file_is_missing(
	file: Inode,
	selected_display_ids: string[]
): Promise<string[]> {
	const file_primary_key = get_file_primary_key(file);
	const files_on_selected_displays = await db.files_on_display
		.where('file_primary_key')
		.equals(file_primary_key)
		.filter((e) => selected_display_ids.includes(e.display_id))
		.toArray();
	return selected_display_ids.filter(
		(id) => !files_on_selected_displays.some((item) => item.display_id === id)
	);
}

export async function get_displays_where_path_not_exists(
	path: string,
	selected_display_ids: string[]
): Promise<Display[]> {
	if (path === '/') return await db.displays.where('id').anyOf(selected_display_ids).toArray();
	const last_path_part =
		path
			.slice(0, path.length - 1)
			.split('/')
			.at(-1) ?? '';
	const path_without_last_part = path.slice(0, path.length - (last_path_part.length + 1));

	const folders_of_current_path = await db.files
		.where('name')
		.equals(last_path_part)
		.filter((inode) => inode.path === path_without_last_part && is_folder(inode))
		.first();
	if (!folders_of_current_path) return [];
	const folder_primary_key = get_file_primary_key(folders_of_current_path);

	const display_ids_with_folder = (
		await db.files_on_display.where('file_primary_key').equals(folder_primary_key).toArray()
	).map((fod) => fod.display_id);

	const display_ids = selected_display_ids.filter((display_id) => {
		return !display_ids_with_folder.includes(display_id);
	});

	return (await db.displays.bulkGet(display_ids)).filter((e) => e !== undefined);
}

async function get_changed_directory_paths(
	display: Display,
	file_path: string
): Promise<string[] | null> {
	const current_folder = await get_file_tree_data(display.ip, file_path);
	const directory_strings = await get_recursive_changed_directory_paths(
		display,
		file_path,
		current_folder
	);
	if (directory_strings.size === 0) return null;
	const directory_strings_array = [...directory_strings];
	return directory_strings_array.filter(
		(e) => !directory_strings_array.some((f) => f !== e && f.startsWith(e))
	);
}

async function get_recursive_changed_directory_paths(
	display: Display,
	current_file_path: string,
	current_folder_elements: TreeElement[] | null
): Promise<Set<string>> {
	const files_folder: Inode[] = await db.files.where('path').equals(current_file_path).toArray();
	if (
		(!files_folder || files_folder.length === 0) &&
		(!current_folder_elements || current_folder_elements.length === 0)
	) {
		return new Set([]); // no data -> no update needed
	} else if (
		!files_folder ||
		!current_folder_elements ||
		current_folder_elements.length !== files_folder.length
	) {
		return new Set([current_file_path]); // existing data does not match new data -> update
	}

	const has_changed: Set<string> = new Set();
	for (const tree_folder_element of current_folder_elements) {
		const folder_element = files_folder.find((e) => e.name === tree_folder_element.name);
		if (
			!folder_element ||
			(tree_folder_element.type !== 'directory' && folder_element.size !== tree_folder_element.size)
		) {
			return new Set([current_file_path]);
		}

		if (tree_folder_element.type === 'directory' && tree_folder_element.contents) {
			const new_file_path = current_file_path + tree_folder_element.name + '/';
			for (const string of await get_recursive_changed_directory_paths(
				display,
				new_file_path,
				tree_folder_element.contents
			)) {
				has_changed.add(string);
			}
		}
	}
	return has_changed;
}

export async function update_folder_elements_recursively(
	display: Display,
	file_path: string = '/'
): Promise<void> {
	const new_folder_elements = await get_file_data(display.ip, file_path);
	if (!new_folder_elements) return;

	const loading_file_ids = Object.keys(get(file_transfer_tasks));
	const loading_file_keys_without_size = (
		await db.files.bulkGet(
			loading_file_ids.map((string_id) => JSON.parse(string_id) as [string, string, number, string])
		)
	)
		.filter((f) => !!f)
		.map((f) => JSON.stringify([f.path, f.name, f.type]));

	// Filter new files, which aren't currently uploading
	const existing_files_on_display_in_path: FileOnDisplay[] = await db.files_on_display
		.where('display_id')
		.equals(display.id)
		.filter((f) => !loading_file_ids.includes(f.file_primary_key))
		.toArray();
	const existing_file_keys_on_display_in_path: [string, string, number, string][] =
		existing_files_on_display_in_path.map(
			(e) => JSON.parse(e.file_primary_key) as [string, string, number, string]
		);
	const existing_files: Inode[] = await db.files
		.where('[path+name+size+type]')
		.anyOf(existing_file_keys_on_display_in_path)
		.filter((e) => e.path === file_path)
		.toArray();

	const diff = get_folder_elements_difference(existing_files, new_folder_elements);

	// Filter new files, which aren't currently uploading -> don't compare size
	diff.new = diff.new.filter(
		(e) =>
			!loading_file_keys_without_size.includes(
				JSON.stringify([e.folder_element.path, e.folder_element.name, e.folder_element.type])
			)
	);

	if (diff.new.length > 0) {
		// Add new Folder-Elements
		for (const new_element of diff.new) {
			await db.files.put(new_element.folder_element);
			const file_on_display: FileOnDisplay = {
				display_id: display.id,
				file_primary_key: get_file_primary_key(new_element.folder_element),
				date_created: new_element.date_created
			};
			await db.files_on_display.put(file_on_display);

			if (is_folder(new_element.folder_element)) {
				await update_folder_elements_recursively(
					display,
					file_path + new_element.folder_element.name + '/'
				);
			}
		}

		// Generate Thumbnails:
		setTimeout(async () => {
			for (const new_element of diff.new) {
				await generate_thumbnail(display.ip, file_path, new_element.folder_element);
			}
		}, 0);
	}
	if (diff.deleted.length > 0) {
		// Remove old Folder-Elements
		for (const old_element of diff.deleted) {
			remove_file_from_display_recusively(display.id, get_file_primary_key(old_element));
		}
		await remove_all_files_without_display();
	}
}

function get_folder_elements_difference(
	old_elements: Inode[],
	new_elements: { folder_element: Inode; date_created: Date }[]
): { deleted: Inode[]; new: { folder_element: Inode; date_created: Date }[] } {
	const old_keys = new Set(old_elements.map((e) => get_file_primary_key(e)));
	const new_keys = new Set(new_elements.map((e) => get_file_primary_key(e.folder_element)));

	const only_in_old = old_elements.filter((e) => !new_keys.has(get_file_primary_key(e)));
	const only_in_new = new_elements.filter(
		(e) => !old_keys.has(get_file_primary_key(e.folder_element))
	);
	return { deleted: only_in_old, new: only_in_new };
}

export async function get_folder_elements(
	file_path: string,
	selected_display_ids: string[]
): Promise<Inode[]> {
	const existing_file_keys_on_selected_displays: [string, string, number, string][] = (
		await db.files_on_display.where('display_id').anyOf(selected_display_ids).toArray()
	).map((e) => JSON.parse(e.file_primary_key) as [string, string, number, string]);
	const existing_files_on_selected_displays_in_path: Inode[] = await db.files
		.where('[path+name+size+type]')
		.anyOf(existing_file_keys_on_selected_displays)
		.filter((e) => e.path === file_path)
		.toArray();

	return sort_files(existing_files_on_selected_displays_in_path);
}

function sort_files(files: Inode[]) {
	files.sort((a, b) => {
		const isDirA = is_folder(a);
		const isDirB = is_folder(b);

		// Ordner zuerst
		if (isDirA && !isDirB) return -1;
		if (!isDirA && isDirB) return 1;

		// Danach alphabetisch nach name (case-insensitive)
		const nameCompare = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
		if (nameCompare !== 0) return nameCompare;

		return -1;
	});
	return files;
}

export async function get_file_by_id(
	file_primary_key: string,
	only_from_selected_displays: boolean = false
): Promise<Inode | null> {
	const file = (await db.files.get(JSON.parse(file_primary_key))) ?? null;
	if (!file || !only_from_selected_displays) {
		return file;
	} else {
		const exist_on_selected_display = !!(await db.files_on_display
			.where('file_primary_key')
			.equals(file_primary_key)
			.filter((e) => get(selected_display_ids).includes(e.display_id))
			.first());
		return exist_on_selected_display ? file : null;
	}
}

export async function run_for_selected_files_on_selected_displays(
	action: (ip: string, file_names: string[]) => Promise<void>
): Promise<void> {
	for (const display_id of get(selected_display_ids)) {
		const file_key_strings_on_display: string[] = (
			await db.files_on_display.where('display_id').equals(display_id).toArray()
		).map((e) => e.file_primary_key);

		const selected_file_keys_on_display: [string, string, number, string][] =
			file_key_strings_on_display
				.filter((primary_key_string) => is_selected(primary_key_string, get(selected_file_ids)))
				.map(
					(primary_key_string) => JSON.parse(primary_key_string) as [string, string, number, string]
				);
		if (selected_file_keys_on_display.length === 0) continue;

		const selected_file_names_on_display: string[] = (
			await db.files.where('[path+name+size+type]').anyOf(selected_file_keys_on_display).toArray()
		).map((e) => e.name);

		const display = await get_display_by_id(display_id);
		if (!display) continue;

		await action(display.ip, selected_file_names_on_display);
	}
}

export async function create_path_on_all_selected_displays(
	path: string,
	selected_display_ids: string[]
) {
	const displays_without_path = await get_displays_where_path_not_exists(
		path,
		selected_display_ids
	);
	if (displays_without_path.length === 0) return;
	for (const display of displays_without_path) {
		await create_path(display.ip, path);
	}
	setTimeout(async () => {
		for (const display of displays_without_path) {
			const changed_paths = await get_changed_directory_paths(display, '/');
			if (!changed_paths) continue;
			console.debug('Update file system from', display.name, ':', changed_paths);
			for (const path of changed_paths) {
				await update_folder_elements_recursively(display, path);
			}
		}
	}, 0);
}

export async function get_date_mapping(file_primary_key: string): Promise<Record<string, Date>> {
	const same_file_on_displays: FileOnDisplay[] = await db.files_on_display
		.where('file_primary_key')
		.equals(file_primary_key)
		.toArray();
	const displays_with_that_file: Display[] = await db.displays
		.where('id')
		.anyOf(same_file_on_displays.map((e) => e.display_id))
		.toArray();

	const out: Record<string, Date> = {};
	for (const current_file_on_display of same_file_on_displays) {
		const current_name = displays_with_that_file.find(
			(e) => e.id === current_file_on_display.display_id
		)?.name;
		if (!current_name) continue;
		const current_date = current_file_on_display.date_created;
		out[current_name] = current_date;
	}

	return out;
}
