import { dev } from '$app/environment';
import { db } from './files_display.db';
import { get_display_by_id } from './stores/displays';
import { remove_all_files_without_display, remove_file_from_display } from './stores/files';
import { notifications } from './stores/notification';
import { generate_thumbnail } from './stores/thumbnails';
import {
	get_file_primary_key,
	type FileOnDisplay,
	type FileTransferTask,
	type Inode
} from './types';
import { get_uuid, make_valid_name } from './utils';

let is_processing: boolean = false;
const tasks: FileTransferTask[] = [];

export async function add_upload(
	file_list: FileList,
	selected_display_ids: string[],
	current_file_path: string
) {
	if (file_list.length === 0) return;

	for (const file of file_list) {
		const file_name = make_valid_name(file.name);
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

		if (dev) {
			console.debug('AKTUELL IN TASKS', tasks.length);
		}
		tasks.shift(); // Remove current_task from tasks
	}
}

function file_url(ip: string, path: string, file_name: string) {
	return `http://${ip}:1323/api/file${path}${encodeURIComponent(file_name)}`;
}

async function upload(task: FileTransferTask): Promise<void> {
	if (task.type !== 'upload' || !task.file) return;

	await db.files_on_display
		.where('[display_id+file_primary_key]')
		.equals([task.display_id, task.file_primary_key])
		.modify({ percentage: 1 });

	return new Promise<void>((resolve) => {
		const xhr = new XMLHttpRequest();
		xhr.open('POST', file_url(task.display_ip, task.path, task.file_name), true);
		xhr.setRequestHeader('content-type', 'application/octet-stream');

		xhr.upload.onprogress = (e) => {
			const total = e.lengthComputable ? e.total : task.bytes_total;
			const current_percentage = total > 0 ? Math.round((e.loaded / total) * 100) : 1;
			const apply = async () => {
				await db.files_on_display
					.where('[display_id+file_primary_key]')
					.equals([task.display_id, task.file_primary_key])
					.modify({ percentage: current_percentage });
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
					await db.files_on_display
						.where('[display_id+file_primary_key]')
						.equals([task.display_id, task.file_primary_key])
						.modify({ percentage: 100, is_loading: false });
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
		}, 0);
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
