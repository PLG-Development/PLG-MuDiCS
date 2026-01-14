import { db } from './database';
import { get_display_by_id } from './stores/displays';
import {
	get_current_folder_elements,
	get_file_by_id,
	remove_all_files_without_display,
	remove_file_from_display
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

let is_processing: boolean = false;
const tasks: FileTransferTask[] = [];

export async function add_upload(
	file_list: FileList,
	selected_display_ids: string[],
	current_file_path: string
) {
	if (file_list.length === 0) return console.warn('Upload canceled: no selected files');

	const used_file_names: string[] = await (
		await get_current_folder_elements(current_file_path, selected_display_ids)
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
		await db.files.put(db_file);

		const upload_task_promises = selected_display_ids.map(async (display_id) => {
			const display_ip = (await get_display_by_id(display_id))?.ip;
			if (!display_ip) return;

			const db_file_on_display: FileOnDisplay = {
				display_id,
				file_primary_key,
				date_created: new Date(),
				loading_data: {
					type: 'upload',
					percentage: 0,
					bytes_per_second: 0,
					seconds_until_finish: -1
				}
			};
			await db.files_on_display.put(db_file_on_display);

			return {
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
				file_primary_key,
				bytes_total: file.size
			};
		});

		const upload_tasks = (await Promise.all(upload_task_promises)).filter((e) => !!e);
		tasks.push(...upload_tasks);
	}

	await start_task_processing();
}

export async function add_sync(selected_file_id: string, selected_display_ids: string[]) {
	const file_data = await find_file_data_on_active_selected_display(
		selected_file_id,
		selected_display_ids
	);
	if (!file_data) return console.warn('Sync canceled: no file_data');

	tasks.push({
		data: {
			type: 'sync',
			destination_displays: file_data.short_displays_without_file
		},
		display: file_data.short_display_with_file,
		path: file_data.file.path,
		file_name: file_data.file.name,
		file_primary_key: selected_file_id,
		bytes_total: file_data.file.size
	});

	await db.files_on_display.update([file_data.short_display_with_file.id, selected_file_id], {
		loading_data: {
			type: 'sync_download',
			percentage: 0,
			bytes_per_second: 0,
			seconds_until_finish: -1
		}
	});
	const display_ids_without_file = file_data.short_displays_without_file.map((d) => d.id);
	await db.files_on_display
		.where('file_primary_key')
		.equals(selected_file_id)
		.filter((e) => display_ids_without_file.includes(e.display_id))
		.modify({
			loading_data: {
				type: 'sync_upload',
				percentage: 0,
				bytes_per_second: 0,
				seconds_until_finish: -1
			}
		});
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

async function upload(task: FileTransferTask): Promise<void> {
	const task_data = task.data;
	if (task_data.type !== 'upload' || !task_data.file)
		return console.warn('Task cancelled: wrong task type:', task);

	await upload_file_via_xhr(task, task.display, task_data.file);
}

export async function sync(task: FileTransferTask) {
	if (task.data.type !== 'sync') return console.warn('Task cancelled: wrong task type:', task);

	const hasOPFS =
		typeof navigator !== 'undefined' &&
		'storage' in navigator &&
		'getDirectory' in navigator.storage;
	if (!hasOPFS) {
		return show_error(
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
			return show_error(task, `HTTP ${fetch_source.status}`);

		const dir = await navigator.storage.getDirectory();
		const file_handle = await dir.getFileHandle(temp_name, { create: true });
		const writable = await file_handle.createWritable();
		const reader = fetch_source.body.getReader();

		const start_time = new Date();
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			if (!value) continue;

			await update_current_loading_data('sync_download', task, value.byteLength, start_time);
			await writable.write(value);
		}
		await writable.close();

		// 02 - send downloaded file to every destination_display
		const temp_file = await file_handle.getFile();

		for (const current_short_display of task.data.destination_displays) {
			await upload_file_via_xhr(task, current_short_display, temp_file);
		}

		await dir.removeEntry(temp_name);
	} catch (e) {
		show_error(task, String(e));
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
		is_processing = tasks.length !== 0;
		await start_task_loop();
	}
}

async function start_task_loop() {
	while (tasks.length > 0) {
		const current_task = tasks[0];
		if (current_task.data.type === 'upload') {
			await upload(current_task);
		} else if (current_task.data.type === 'sync') {
			await sync(current_task);
		}
		tasks.shift(); // Remove current_task from tasks
	}
	is_processing = false;
}

async function upload_file_via_xhr(
	task: FileTransferTask,
	current_short_display: ShortDisplay,
	current_file: File
) {
	const start_time = new Date();
	const loading_type = task.data.type === 'upload' ? 'upload' : 'sync_upload';

	return new Promise<void>((resolve) => {
		const xhr = new XMLHttpRequest();
		xhr.open(
			'POST',
			`http://${current_short_display.ip}:1323/api${get_sanitized_file_url(task.path + task.file_name)}`,
			true
		);
		xhr.setRequestHeader('content-type', 'application/octet-stream');

		xhr.upload.onprogress = (e) => {
			const apply = async () => {
				await update_current_loading_data(
					loading_type,
					task,
					e.loaded,
					start_time,
					current_short_display.id
				);
			};
			apply();
		};

		xhr.onerror = async (e: ProgressEvent) => {
			await show_error(task, e);
			resolve();
		};

		xhr.onreadystatechange = async () => {
			if (xhr.readyState === 4) {
				if (xhr.status == 200) {
					// set loading_data to 100%
					await db.files_on_display.update([current_short_display.id, task.file_primary_key], {
						date_created: new Date(),
						loading_data: null
					});
					// Generate Thumbnail if not done already
					setTimeout(async () => {
						const inode_element: Inode | undefined = await db.files.get(
							JSON.parse(task.file_primary_key) as [string, string, number, string]
						);
						if (!!inode_element && inode_element.thumbnail === null) {
							await generate_thumbnail(task.display.ip, task.path, inode_element);
						}
					}, 10);
				} else {
					await show_error(task, `HTTP ${xhr.status}`);
				}
				resolve();
			}
		};

		xhr.send(current_file);
	});
}

async function update_current_loading_data(
	type: FileLoadingData['type'],
	task: FileTransferTask,
	current_bytes: number,
	start_time: Date,
	other_display_id: string | null = null
) {
	const current_percentage = Math.min(
		task.bytes_total > 0 ? Math.round((current_bytes / task.bytes_total) * 100) : 1,
		99
	); // calculate percantage, but maximum value is 99%
	const prognosed_data = get_prognosed_data(start_time, current_bytes, task.bytes_total);

	await db.files_on_display.update(
		[other_display_id ? other_display_id : task.display.id, task.file_primary_key],
		{
			loading_data: {
				type,
				percentage: current_percentage,
				bytes_per_second: prognosed_data.bytes_per_second,
				seconds_until_finish: prognosed_data.seconds_until_finish
			}
		}
	);
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

async function show_error(task: FileTransferTask, error: ProgressEvent | string) {
	const task_data = task.data;
	console.error('Error in File-Transfer-Handler:', error, task);
	notifications.push(
		'error',
		`Fehler beim ${task_data.type === 'upload' ? 'Dateiupload' : 'Sychronisieren von Dateien'}`,
		`Datei: "${task.file_name}", Display-IP: ${task.display.ip}\nFehler: ${error}`
	);
	if (task_data.type === 'upload') {
		await remove_file_from_display(task.display.id, task.file_primary_key);
		await remove_all_files_without_display();
	} else if (task_data.type === 'sync') {
		for (const display_id of task_data.destination_displays.map((e) => e.id)) {
			await remove_file_from_display(display_id, task.file_primary_key);
		}
		await remove_all_files_without_display();
	}
}
