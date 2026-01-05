import { db } from './files_display.db';
import { get_display_by_id } from './stores/displays';
import {
	get_current_folder_elements,
	remove_all_files_without_display,
	remove_file_from_display
} from './stores/files';
import { notifications } from './stores/notification';
import { generate_thumbnail } from './stores/thumbnails';
import {
	get_file_primary_key,
	type FileOnDisplay,
	type FileTransferTask,
	type Inode
} from './types';
import { get_sanitized_file_url, get_uuid, make_valid_name } from './utils';

let is_processing: boolean = false;
const tasks: FileTransferTask[] = [];

export async function add_upload(
	file_list: FileList,
	selected_display_ids: string[],
	current_file_path: string
) {
	if (file_list.length === 0) return;

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
				is_loading: true,
				percentage: 0
			};
			await db.files_on_display.put(db_file_on_display);

			return {
				id: get_uuid(),
				type: 'upload' as const,
				display_id,
				display_ip,
				path: current_file_path,
				file_name: file_name,
				file_primary_key,
				file,
				bytes_total: file.size
			};
		});

		const upload_tasks = (await Promise.all(upload_task_promises)).filter((e) => !!e);
		tasks.push(...upload_tasks);
	}

	await start_task_processing();
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
			console.log('current', current_number);
			name_without_extension = name_without_extension.replace(regex, ` (${current_number + 1})`);
		}
		name = name_without_extension + extension;
		console.log(name);
	}
	return name;
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
		switch (current_task.type) {
			case 'upload':
				await upload(current_task);
				break;
			case 'download':
				break;
			case 'sync':
				break;
		}
		tasks.shift(); // Remove current_task from tasks
	}
}

async function upload(task: FileTransferTask): Promise<void> {
	if (task.type !== 'upload' || !task.file) return;

	await db.files_on_display.update([task.display_id, task.file_primary_key], { percentage: 1 });

	return new Promise<void>((resolve) => {
		const xhr = new XMLHttpRequest();
		xhr.open(
			'POST',
			`http://${task.display_ip}:1323/api${get_sanitized_file_url(task.path + task.file_name)}`,
			true
		);
		xhr.setRequestHeader('content-type', 'application/octet-stream');

		xhr.upload.onprogress = (e) => {
			const total = e.lengthComputable ? e.total : task.bytes_total;
			const current_percentage = total > 0 ? Math.round((e.loaded / total) * 100) : 1;
			const apply = async () => {
				await db.files_on_display.update([task.display_id, task.file_primary_key], {
					percentage: current_percentage
				});
			};
			apply();
		};

		xhr.onerror = async (e: ProgressEvent) => {
			await show_error('upload', e, task);
			resolve();
		};

		xhr.onreadystatechange = async () => {
			if (xhr.readyState === 4) {
				if (xhr.status == 200) {
					await db.files_on_display.update([task.display_id, task.file_primary_key], {
						percentage: 100,
						is_loading: false
					});
				} else {
					await show_error('upload', `HTTP ${xhr.status}`, task);
				}
				resolve();
			}
		};

		xhr.send(task.file);
	}).then(() => {
		// Generate Thumbnail if not done already
		setTimeout(async () => {
			const inode_element: Inode | undefined = await db.files.get(
				JSON.parse(task.file_primary_key) as [string, string, number, string]
			);
			if (!!inode_element && inode_element.thumbnail === null) {
				await generate_thumbnail(task.display_ip, task.path, inode_element);
			}
		}, 10);
	});
}

async function show_error(
	type: 'upload' | 'download' | 'sync',
	error: ProgressEvent | string,
	task: FileTransferTask
) {
	notifications.push(
		'error',
		`Fehler beim ${type === 'upload' ? 'Dateiupload' : type === 'download' ? 'Dateidownload' : 'Sychronisieren von Dateien'}`,
		`Datei: "${task.file_name}", Display-IP: ${task.display_ip}\nFehler: ${error}`
	);
	if (type === 'download') return;
	await remove_file_from_display(task.display_id, task.file_primary_key);
	await remove_all_files_without_display();
}
