import { get, writable, type Writable } from "svelte/store";
import type { Display, FolderElement } from "../types";
import { displays, update_displays_with_map } from "./displays";
import { selected_display_ids, selected_file_ids } from "./select";
import { get_file_data } from "../api_handler";
import { get_uuid } from "../utils";
import type { Folder } from "lucide-svelte";
import { notifications } from "./notification";

export const all_files: Writable<Record<string, Record<string, FolderElement[]>>> = writable<Record<string, Record<string, FolderElement[]>>>({});
// {
// path: {
//          display_id: FolderElement[]
//          ...
//      },
// path2: {
//          display_id: FolderElement[]
//          ...
//      },
// ...
// }

export const current_file_path: Writable<string> = writable<string>('/');


export function change_file_path(new_path: string) {
    current_file_path.update(() => {
        return new_path;
    });
    selected_file_ids.update(() => {
        return [];
    })
    setTimeout(async () => { await update_all_display_files(new_path) }, 0);
}

export function get_display_ids_where_file_is_missing(path: string, file: FolderElement, selected_display_ids: string[], all_files: Record<string, Record<string, FolderElement[]>>): string[][] {
    if (!all_files.hasOwnProperty(path)) return [];
    const missing: string[] = [];
    const colliding: string[] = [];
    Display:
    for (const selected_display_id of selected_display_ids) {
        if (!all_files[path].hasOwnProperty(selected_display_id)) {
            missing.push(selected_display_id);
            continue;
        }
        for (const folder_element of all_files[path][selected_display_id]) {
            if (folder_element.name === file.name) {
                if (folder_element.hash !== file.hash) {
                    colliding.push(selected_display_id);
                }
                continue Display;
            }
        }
        missing.push(selected_display_id);
    }
    return [missing, colliding];
}

export async function update_all_display_files(path: string) {
    for (const display_group of get(displays)) {
        for (const display of display_group.data) {
            await update_folder_elements_recursively(display, path);
        }
    }
}

async function update_folder_elements_recursively(display: Display, file_path: string = '/'): Promise<number> {
    const new_folder_elements = await get_file_data(display.ip, file_path);
    all_files.update((files: Record<string, Record<string, FolderElement[]>>) => {
        if (!files.hasOwnProperty(file_path)) {
            files[file_path] = {};
        }
        if (!files[file_path].hasOwnProperty(display.id)) {
            files[file_path][display.id] = [];
        }

        const existing_folder_elements = files[file_path].hasOwnProperty(display.id) ? files[file_path][display.id] : [];

        const diff = get_folder_elements_difference(existing_folder_elements, new_folder_elements);
        files[file_path][display.id].push(...diff.new);
        return remove_folder_elements_recursively(files, display, diff.deleted, file_path);
    })

    let folder_size = 0;
    for (const element of new_folder_elements) {
        if (element.type === 'inode/directory') {
            const folder_content_size = await update_folder_elements_recursively(display, file_path + element.name + '/');
            folder_size += folder_content_size;
            // Update foldersize
            all_files.update((files: Record<string, Record<string, FolderElement[]>>) => {
                for (const current_folder_element of files[file_path][display.id]) {
                    if (current_folder_element.id === element.id) {
                        current_folder_element.size = folder_content_size;
                    }
                }
                return files;
            })
        } else {
            folder_size += element.size;
        }
    }
    return folder_size;
}

function remove_folder_elements_recursively(files: Record<string, Record<string, FolderElement[]>>, display: Display, folder_elements: FolderElement[], file_path: string): Record<string, Record<string, FolderElement[]>> {
    if (!files.hasOwnProperty(file_path) || !files[file_path].hasOwnProperty(display.id)) {
        console.error("File remove path does not exist:", files, display, folder_elements, file_path);
        notifications.push("error", "Fehler beim Aktualisieren der Dateien", `File remove path does not exist: ${file_path} display_ip: ${display.ip}`);
        return {};
    }
    for (const folder_element of folder_elements) {
        files[file_path][display.id] = files[file_path][display.id].filter((f) => f.id !== folder_element.id);

        if (folder_element.type === 'inode/directory') {
            const new_file_path = file_path + folder_element.name + '/';
            if (!files.hasOwnProperty(new_file_path) || !files[new_file_path].hasOwnProperty(display.id)) {
                console.error("File remove path does not exist (recursion):", files, display, folder_elements, file_path, new_file_path);
                notifications.push("error", "Fehler beim Aktualisieren der Dateien", `File remove path does not exist (recursion): ${new_file_path} display_ip: ${display.ip}`);
                return {};
            }
            const sub_folder = files[new_file_path][display.id];
            remove_folder_elements_recursively(files, display, sub_folder, new_file_path);
        }
    }

    return files;
}

function get_folder_elements_difference(old_elements: FolderElement[], new_elements: FolderElement[]): { deleted: FolderElement[], new: FolderElement[] } {
    const old_hashes = new Set(old_elements.map(e => e.hash));
    const new_hashes = new Set(new_elements.map(e => e.hash));

    const only_in_old = old_elements.filter(e => !new_hashes.has(e.hash));
    const only_in_new = new_elements.filter(e => !old_hashes.has(e.hash));
    return { deleted: only_in_old, new: only_in_new };
}



// export function updates_files_on_display(display_id: string, new_folder_elements: FolderElement[], file_path: string) {
//     all_files.update((files) => {
//         if (!files.hasOwnProperty(file_path)) {
//             files[file_path] = {};
//         }
//         files[file_path][display_id] = new_folder_elements;
//         return files;
//     });
// }

// async function get_files_on_all_displays(current_file_path: string) {
//     for (const display_group of get(displays)) {
//         for (const display of display_group.data) {
//             const new_folder_elements = await get_file_data(display.ip, current_file_path);
//             updates_files_on_display(display.id, new_folder_elements, current_file_path)
//             console.log(new_folder_elements)
//         }
//     }
// }


export function get_current_folder_elements(all_files: Record<string, Record<string, FolderElement[]>>, current_file_path: string, selected_display_ids: string[]) {
    if (!all_files.hasOwnProperty(current_file_path)) return [];

    const files_on_display_array = all_files[current_file_path];
    const files: FolderElement[] = [];
    for (const key of Object.keys(files_on_display_array)) {
        if (selected_display_ids.includes(key)) {
            FileOnDisplay:
            for (const file_on_display of files_on_display_array[key]) {
                for (const existing_file of files) {
                    if (file_on_display.name === existing_file.name) {
                        if (file_on_display.hash === existing_file.hash) {
                            continue FileOnDisplay;
                        }
                    }
                }
                files.push(file_on_display);
            }
        }
    }

    return sort_files(files);
}

function sort_files(files: FolderElement[]) {
    files.sort((a, b) => {
        const isDirA = a.type === 'inode/directory';
        const isDirB = b.type === 'inode/directory';

        // Ordner zuerst
        if (isDirA && !isDirB) return -1;
        if (!isDirA && isDirB) return 1;

        // Danach alphabetisch nach name (case-insensitive)
        const nameCompare = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        if (nameCompare !== 0) return nameCompare;

        // Wenn name gleich, absteigend nach date_created
        return b.date_created.getTime() - a.date_created.getTime();
    });
    return files;
}

