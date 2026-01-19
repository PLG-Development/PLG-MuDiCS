import { get, writable, type Writable } from 'svelte/store';
import { db } from './database';
import { get_display_by_id } from './stores/displays';
import {
	create_path_on_all_selected_displays,
	get_folder_elements,
	get_file_by_id,
	remove_all_files_without_display,
	remove_file_from_display_recusively
} from './stores/files';
import { notifications } from './stores/notification';
import { generate_thumbnail } from './stores/thumbnails';
import {
	get_file_primary_key,
	type FileLoadingData,
	type FileOnDisplay,
	type FileTransferTask,
	type Inode,
	type ShortDisplay
} from './types';
import { get_sanitized_file_url, get_uuid, make_valid_name } from './utils';

const START_LOADING_DATA = {
	percentage: 0,
	bytes_per_second: 0,
	seconds_until_finish: -1
};

export const file_transfer_tasks: Writable<Record<string, FileTransferTask>> = writable<
	Record<string, FileTransferTask>
>({});

let is_processing: boolean = false;

export async function add_upload(
	file_list: FileList,
	selected_display_ids: string[],
	current_file_path: string
) {
	if (file_list.length === 0) return console.warn('Upload canceled: no selected files');
	await create_path_on_all_selected_displays(current_file_path, selected_display_ids);

	const used_file_names: string[] = await (
		await get_folder_elements(current_file_path, selected_display_ids)
	).map((e) => e.name);

	for (const file of file_list) {
		const file_name = generate_valid_file_name(file.name, used_file_names);
		used_file_names.push(file_name);

		const db_file: Inode = {
			path: current_file_path,
			name: file_name,
			size: file.size,
			type: file.type,
			thumbnail: null
		};
		const file_primary_key = get_file_primary_key(db_file);

		if (Object.prototype.hasOwnProperty.call(file_transfer_tasks, file_primary_key))
			return show_already_in_tasks_error(db_file, 'upload'); // file is already in task

		await db.files.put(db_file);

		const upload_task_promises = selected_display_ids.map(async (display_id) => {
			const display_ip = (await get_display_by_id(display_id))?.ip;
			if (!display_ip) return;

			const db_file_on_display: FileOnDisplay = {
				display_id,
				file_primary_key,
				date_created: new Date()
			};
			await db.files_on_display.put(db_file_on_display);

			const new_task = {
				data: {
					type: 'upload' as const,
					file
				},
				display: {
					id: display_id,
					ip: display_ip
				},
				path: current_file_path,
				file_name: file_name,
				loading_data: START_LOADING_DATA,
				bytes_total: file.size
			};
			file_transfer_tasks.update((tasks) => ({
				...tasks,
				[file_primary_key]: new_task
			}));
		});

		await Promise.all(upload_task_promises);
	}

	await start_task_processing();
}

export async function add_sync_recursively(
	selected_file_id: string,
	selected_display_ids: string[]
) {
	const file_data = await find_file_data_on_active_selected_display(
		selected_file_id,
		selected_display_ids
	);
	if (!file_data) return console.warn('Sync canceled: no file_data');

	if (file_data.file.type === 'inode/directory') {
		const new_path = file_data.file.path + file_data.file.name + '/';
		const elements_in_folder = await get_folder_elements(new_path, selected_display_ids);
		if (elements_in_folder.length === 0) {
			await create_path_on_all_selected_displays(new_path, selected_display_ids);
		} else {
			for (const el of elements_in_folder) {
				await add_sync_recursively(get_file_primary_key(el), selected_display_ids);
			}
		}
		return; // cannot sync folder
	}

	if (file_data.short_displays_without_file.length === 0) return; // file is present on all selected displays
	if (Object.prototype.hasOwnProperty.call(file_transfer_tasks, selected_file_id))
		return show_already_in_tasks_error(file_data.file, 'sync'); // file is already in task
	await create_path_on_all_selected_displays(file_data.file.path, selected_display_ids);

	const new_task: FileTransferTask = {
		data: {
			type: 'sync',
			destination_display_data: file_data.short_displays_without_file.map((display) => ({
				display,
				loading_data: START_LOADING_DATA
			}))
		},
		display: file_data.short_display_with_file,
		path: file_data.file.path,
		file_name: file_data.file.name,
		loading_data: START_LOADING_DATA,
		bytes_total: file_data.file.size
	};

	file_transfer_tasks.update((tasks) => ({
		...tasks,
		[selected_file_id]: new_task
	}));

	const display_ids_without_file = file_data.short_displays_without_file.map((d) => d.id);
	const new_fods: FileOnDisplay[] = display_ids_without_file.map((display_id) => ({
		display_id,
		file_primary_key: selected_file_id,
		date_created: new Date()
	}));
	await db.files_on_display.bulkPut(new_fods);

	await start_task_processing();
}

async function find_file_data_on_active_selected_display(
	selected_file_id: string,
	selected_display_ids: string[]
): Promise<{
	file_on_display: FileOnDisplay;
	file: Inode;
	short_display_with_file: ShortDisplay;
	short_displays_without_file: ShortDisplay[];
} | null> {
	const active_selected_displays = await db.displays
		.where('id')
		.anyOf(selected_display_ids)
		.filter((d) => d.status === 'app_online')
		.toArray();
	const active_selected_display_ids = active_selected_displays.map((d) => d.id);

	const fods = await db.files_on_display
		.where('file_primary_key')
		.equals(selected_file_id)
		.filter((e) => active_selected_display_ids.includes(e.display_id))
		.toArray();
	if (fods.length < 0) return null;
	const fod_with_file = fods[0];
	const display_ids_with_file = fods.map((f) => f.display_id);

	const ip = active_selected_displays.find((e) => e.id === fod_with_file.display_id)?.ip;
	if (!ip) return null;

	const short_displays_without_file: ShortDisplay[] = selected_display_ids
		.filter((d) => !display_ids_with_file.includes(d))
		.map((id) => {
			const ip = active_selected_displays.find((d) => d.id === id)?.ip;
			if (!ip) return null;
			return { id, ip };
		})
		.filter((sd) => !!sd);

	const inode = await get_file_by_id(selected_file_id);
	if (!inode) return null;

	return {
		file_on_display: fod_with_file,
		file: inode,
		short_display_with_file: { id: fod_with_file.display_id, ip },
		short_displays_without_file
	};
}

function generate_valid_file_name(original_file_name: string, used_file_names: string[]): string {
	const regex = /\s\((\d{1,3})\)$/;

	let name: string = make_valid_name(original_file_name);
	while (used_file_names.includes(name)) {
		const last_dot = name.lastIndexOf('.');
		let name_without_extension = last_dot > 0 ? name.slice(0, last_dot) : name;
		const extension = last_dot > 0 ? name.slice(last_dot) : '';
		if (!regex.test(name_without_extension)) {
			name_without_extension += ' (1)';
		} else {
			const match = name_without_extension.match(regex);
			const current_number: number = match ? Number(match[1]) : 0;
			name_without_extension = name_without_extension.replace(regex, ` (${current_number + 1})`);
		}
		name = name_without_extension + extension;
	}
	return name;
}

async function upload(file_primary_key: string, task: FileTransferTask): Promise<void> {
	const task_data = task.data;
	if (task_data.type !== 'upload' || !task_data.file)
		return console.warn('Task cancelled: wrong task type:', task);

	await upload_file_via_xhr(file_primary_key, task, task_data.file);
}

export async function sync(file_primary_key: string, task: FileTransferTask) {
	if (task.data.type !== 'sync') return console.warn('Task cancelled: wrong task type:', task);

	const hasOPFS =
		typeof navigator !== 'undefined' &&
		'storage' in navigator &&
		'getDirectory' in navigator.storage;
	if (!hasOPFS) {
		return show_general_error(
			file_primary_key,
			task,
			'OPFS (navigator.storage.getDirectory) nicht verfügbar – bitte Chromium/Edge/Chrome nutzen.'
		);
	}

	const temp_name = `sync-${get_uuid()}.tmp`;

	try {
		// 01 - download file to disk (in browser, not for user)
		const url = `http://${task.display.ip}:1323/api${get_sanitized_file_url(task.path + task.file_name)}`;
		const fetch_source = await fetch(url, { method: 'GET' });
		if (!fetch_source.ok || !fetch_source.body)
			return show_general_error(file_primary_key, task, `HTTP ${fetch_source.status}`);

		const dir = await navigator.storage.getDirectory();
		const file_handle = await dir.getFileHandle(temp_name, { create: true });
		const writable = await file_handle.createWritable();
		const reader = fetch_source.body.getReader();

		const start_time = new Date();
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			if (!value) continue;

			update_current_loading_data(file_primary_key, value.byteLength, start_time);
			await writable.write(value);
		}
		await writable.close();

		finish_loading_data(file_primary_key);

		// 02 - send downloaded file to every destination_display
		const temp_file = await file_handle.getFile();

		for (const current_short_display of task.data.destination_display_data) {
			await upload_file_via_xhr(file_primary_key, task, temp_file, current_short_display.display);
		}

		await dir.removeEntry(temp_name);
	} catch (e) {
		show_general_error(file_primary_key, task, String(e));
	}
}

export async function download_file(selected_file_id: string, selected_display_ids: string[]) {
	const file_data = await find_file_data_on_active_selected_display(
		selected_file_id,
		selected_display_ids
	);
	if (!file_data || file_data.file.type === 'inode/directory')
		return console.warn('Download cancelled: is folder');

	try {
		const url = `http://${file_data.short_display_with_file.ip}:1323/api${get_sanitized_file_url(file_data.file.path + file_data.file.name)}`;

		const a = document.createElement('a');
		a.href = url;
		a.download = file_data.file.name; // Hint für den Browser (Server-Header ist trotzdem besser)
		a.rel = 'noopener';
		document.body.appendChild(a);
		a.click();
		a.remove();
	} catch (e) {
		notifications.push(
			'error',
			'Fehler beim Dateidownload',
			`Datei: "${file_data.file.name}", Display-IP: ${file_data.short_display_with_file.ip}\nFehler: ${e}`
		);
	}
}

async function start_task_processing() {
	if (!is_processing) {
		is_processing = Object.keys(get(file_transfer_tasks)).length !== 0;
		await start_task_loop();
	}
}

async function start_task_loop() {
	while (Object.keys(get(file_transfer_tasks)).length > 0) {
		const tasks = get(file_transfer_tasks);
		const current_file_id = Object.keys(tasks)[0];
		const current_task = tasks[current_file_id];
		if (current_task.data.type === 'upload') {
			await upload(current_file_id, current_task);
		} else if (current_task.data.type === 'sync') {
			await sync(current_file_id, current_task);
		}

		file_transfer_tasks.update((all_tasks) => {
			const next = { ...all_tasks };
			delete next[current_file_id];
			return next;
		});
	}
	is_processing = false;
}

async function upload_file_via_xhr(
	file_primary_key: string,
	task: FileTransferTask,
	current_file: File,
	destination_short_display: ShortDisplay | null = null
) {
	const start_time = new Date();

	return new Promise<void>((resolve) => {
		const xhr = new XMLHttpRequest();
		xhr.open(
			'POST',
			`http://${destination_short_display ? destination_short_display.ip : task.display.ip}:1323/api${get_sanitized_file_url(task.path + task.file_name)}`,
			true
		);
		xhr.setRequestHeader('content-type', 'application/octet-stream');

		xhr.upload.onprogress = (e) => {
			const apply = async () => {
				update_current_loading_data(
					file_primary_key,
					e.loaded,
					start_time,
					destination_short_display ? destination_short_display.id : null
				);
			};
			apply();
		};

		xhr.onerror = async (e: ProgressEvent) => {
			await show_general_error(file_primary_key, task, e);
			resolve();
		};

		xhr.onreadystatechange = async () => {
			if (xhr.readyState === 4) {
				if (xhr.status == 200) {
					// set loading_data to 100%
					finish_loading_data(
						file_primary_key,
						destination_short_display ? destination_short_display.id : null
					);
					// Generate Thumbnail if not done already
					setTimeout(async () => {
						const inode_element: Inode | undefined = await db.files.get(
							JSON.parse(file_primary_key) as [string, string, number, string]
						);
						if (!!inode_element && inode_element.thumbnail === null) {
							await generate_thumbnail(task.display.ip, task.path, inode_element);
						}
					}, 10);
				} else {
					await show_general_error(file_primary_key, task, `HTTP ${xhr.status}`);
				}
				resolve();
			}
		};

		xhr.send(current_file);
	});
}

function finish_loading_data(
	file_primary_key: string,
	destination_display_id: string | null = null
) {
	file_transfer_tasks.update((tasks) => {
		const task = tasks[file_primary_key];
		const current_loading_data = {
			percentage: 100,
			bytes_per_second: 0,
			seconds_until_finish: 0
		};

		return {
			...tasks,
			[file_primary_key]: get_updated_task(current_loading_data, destination_display_id, task)
		};
	});
}

function update_current_loading_data(
	file_primary_key: string,
	current_bytes: number,
	start_time: Date,
	destination_display_id: string | null = null
) {
	file_transfer_tasks.update((tasks) => {
		const task = tasks[file_primary_key];
		if (!task) return tasks;

		const current_percentage = Math.min(
			task.bytes_total > 0 ? Math.round((current_bytes / task.bytes_total) * 100) : 1,
			99
		);

		const prognosed_data = get_prognosed_data(start_time, current_bytes, task.bytes_total);

		const current_loading_data: FileLoadingData = {
			percentage: current_percentage,
			bytes_per_second: prognosed_data.bytes_per_second,
			seconds_until_finish: prognosed_data.seconds_until_finish
		};

		return {
			...tasks,
			[file_primary_key]: get_updated_task(current_loading_data, destination_display_id, task)
		};
	});
}

function get_updated_task(current_loading_data: FileLoadingData, destination_display_id: string | null, task: FileTransferTask): FileTransferTask {
	if (destination_display_id && task.data.type === 'sync') {
		const updatedDestinations = task.data.destination_display_data.map((dd) =>
			dd.display.id === destination_display_id ? { ...dd, loading_data: current_loading_data } : dd
		);

		return {
			...task,
			data: {
				...task.data,
				destination_display_data: updatedDestinations
			}
		};
	} else {
		return {
			...task,
			loading_data: current_loading_data
		};
	}
}

function get_prognosed_data(
	start_time: Date,
	bytes_done: number,
	bytes_total: number
): { bytes_per_second: number; seconds_until_finish: number } {
	const diff_seconds = (Date.now() - start_time.getTime()) / 1000;
	const bytes_per_second = bytes_done / diff_seconds;

	const seconds_until_finish = bytes_total / bytes_per_second;
	return { bytes_per_second, seconds_until_finish };
}

async function show_general_error(
	file_primary_key: string,
	task: FileTransferTask,
	error: ProgressEvent | string
) {
	const task_data = task.data;
	console.error('Error in File-Transfer-Handler:', error, task);
	notifications.push(
		'error',
		`Fehler beim ${task_data.type === 'upload' ? 'Dateiupload' : 'Sychronisieren von Dateien'}`,
		`Datei: "${task.file_name}", Display-IP: ${task.display.ip}\nFehler: ${error}`
	);
	if (task_data.type === 'upload') {
		await remove_file_from_display_recusively(task.display.id, file_primary_key);
		await remove_all_files_without_display();
	} else if (task_data.type === 'sync') {
		for (const display_id of task_data.destination_display_data.map((e) => e.display.id)) {
			await remove_file_from_display_recusively(display_id, file_primary_key);
		}
		await remove_all_files_without_display();
	}
}

function show_already_in_tasks_error(file: Inode, process: 'upload' | 'sync') {
	notifications.push(
		'error',
		`Datei '${file.name}' konnte nicht ${process === 'upload' ? 'hochgeladen' : 'synchronisiert'} werden`,
		`Eine Datei kann nicht in mehreren file_transfer_tasks enthalten sein. Bitte erneut versuchen, wenn die aktuellen Aktionen fertiggestellt wurden`
	);
}
