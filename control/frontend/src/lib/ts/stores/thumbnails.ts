import { get, writable, type Writable } from 'svelte/store';
import { get_thumbnail_blob } from '../api_handler';
import { type Inode } from '../types';
import { db } from '../database';
import { get_file_type } from '../utils';
import { get_file_by_id } from './files';

export const active_thumbnail_urls: Writable<string[]> = writable<string[]>([]);

export async function generate_thumbnail(
	display_ip: string,
	path: string,
	folder_element: Inode
): Promise<void> {
	const supported_file_type = get_file_type(folder_element);
	if (!supported_file_type) return;

	const thumbnail_blob = await get_thumbnail_blob(display_ip, path + folder_element.name);
	if (!thumbnail_blob) return;

	folder_element.thumbnail = thumbnail_blob;

	await db.files.put(folder_element); // save
}

export async function get_thumbnail_url(file_primary_key: string): Promise<string | null> {
	const file: Inode | null = await get_file_by_id(file_primary_key);
	if (!file || !file.thumbnail) return null;
	const new_url = URL.createObjectURL(file.thumbnail);
	active_thumbnail_urls.update((current: string[]) => {
		current.push(new_url);
		return current;
	});
	return new_url;
}

export function deactivate_old_thumbnail_urls() {
	const current_urls = get(active_thumbnail_urls);
	for (const url of current_urls) {
		URL.revokeObjectURL(url);
	}
	active_thumbnail_urls.update(() => {
		return [];
	});
}
