import { get, writable, type Writable } from "svelte/store";
import { get_thumbnail_blob } from "../api_handler";
import { supported_file_types, type FolderElement } from "../types";
import { db } from "../indexdb/file_thumbnails.db";

export const active_thumbnail_urls: Writable<string[]> = writable<string[]>([]);

export async function generate_thumbnail(display_ip: string, path: string, folder_element: FolderElement): Promise<void> {
    if (!Object.values(supported_file_types).some(e => e.mime_type === folder_element.type) || !folder_element.hash) return;
    const hash: string = folder_element.hash;
    if (await db.thumbnail_blobs.get(hash)) return;

    const thumbnail_blob = await get_thumbnail_blob(display_ip, path + folder_element.name);
    if (!thumbnail_blob) return;
    await db.thumbnail_blobs.add({ hash: hash, blob: thumbnail_blob });
}

export async function get_thumbnail_url(hash: string): Promise<string | null> {
    if (hash === null) return null;
    const thumbnail_blob = await db.thumbnail_blobs.get(hash);
    if (!thumbnail_blob) return null;
    const new_url = URL.createObjectURL(thumbnail_blob.blob);
    active_thumbnail_urls.update((current: string[]) => {
        current.push(new_url);
        return current;
    })
    return new_url;
}

export function deactivate_old_thumbnail_urls() {
    const current_urls = get(active_thumbnail_urls);
    for (const url of current_urls) {
        URL.revokeObjectURL(url);
    }
    active_thumbnail_urls.update(() => { return []; })
}