import { get, writable, type Writable } from "svelte/store";
import type { Display, FolderElement, TreeElement } from "../types";
import { displays, get_display_by_id } from "./displays";
import { select, selected_display_ids, selected_file_ids } from "./select";
import { get_file_data, get_file_tree_data } from "../api_handler";
import { notifications } from "./notification";
import { CirclePoundSterling } from "lucide-svelte";
import { deactivate_old_thumbnail_urls, generate_thumbnail } from "./thumbnails";

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


export async function change_file_path(new_path: string) {
    current_file_path.update(() => {
        return new_path;
    });
    selected_file_ids.update(() => {
        return [];
    })

    deactivate_old_thumbnail_urls();

    for (const display_group of get(displays)) {
        for (const display of display_group.data) {
            const changed_paths = await get_changed_directory_paths(display, new_path);
            if (!changed_paths) continue;
            console.log("Update file system from", display.name, ":", changed_paths);
            for (const path of changed_paths) {
                update_folder_elements_recursively(display, path);
            }
        }
    }
}

export async function filter_file_selection_for_current_selected_displays() {
    for (const selected_file_id of get(selected_file_ids)) {
        if (!get_file_by_id(selected_file_id, get(all_files), get(current_file_path), true)) {
            // file not found in selected displays
            select(selected_file_ids, selected_file_id, false);
        }
    }
}

export async function update_current_folder_on_selected_displays() {
    const current_path = get(current_file_path);
    for (const display_id of get(selected_display_ids)) {
        const display = get_display_by_id(display_id, get(displays));
        if (!display) continue;
        update_folder_elements_recursively(display, current_path);
    }
}

export function get_display_ids_where_file_is_missing(path: string, file: FolderElement, selected_display_ids: string[], all_files: Record<string, Record<string, FolderElement[]>>): string[][] {
    if (!all_files.hasOwnProperty(path)) return [selected_display_ids, []];
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

export function get_display_ids_where_path_does_not_exist(path: string, selected_display_ids: string[], all_files: Record<string, Record<string, FolderElement[]>>): string[] {
    if (!all_files.hasOwnProperty(path)) return selected_display_ids;
    const out: string[] = [];
    for (const selected_display_id of selected_display_ids) {
        if (!all_files[path].hasOwnProperty(selected_display_id)) {
            out.push(selected_display_id);
        }
    }
    return out;
}

async function get_changed_directory_paths(display: Display, file_path: string): Promise<string[] | null> {
    const current_folder = await get_file_tree_data(display.ip, file_path);
    const directory_strings = get_recursive_changed_directory_paths(display, file_path, current_folder, get(all_files));
    if (directory_strings.size === 0) return null;
    const directory_strings_array = [...directory_strings];
    return directory_strings_array.filter((e) => (!directory_strings_array.some((f) => (f !== e && f.startsWith(e)))));
}

function get_recursive_changed_directory_paths(display: Display, current_file_path: string, current_folder_elements: TreeElement[] | null, files: Record<string, Record<string, FolderElement[]>>): Set<string> {
    const files_folder: FolderElement[] = files[current_file_path][display.id];
    if ((!files_folder || files_folder.length === 0) && (!current_folder_elements || current_folder_elements.length === 0)) {
        return new Set([]); // no data -> no update needed
    } else if (!files_folder || !current_folder_elements || current_folder_elements.length !== files_folder.length) {
        return new Set([current_file_path]); // existing data does not match new data -> update
    }

    let has_changed: Set<string> = new Set();
    for (const tree_folder_element of current_folder_elements) {
        const folder_element = files_folder.find(e => e.name === tree_folder_element.name);
        if (!folder_element || (tree_folder_element.type !== "directory" && folder_element.size !== tree_folder_element.size)) {
            return new Set([current_file_path]);
        }

        if (tree_folder_element.type === "directory" && tree_folder_element.contents) {
            const new_file_path = current_file_path + tree_folder_element.name + '/';
            for (const string of get_recursive_changed_directory_paths(display, new_file_path, tree_folder_element.contents, files)) {
                has_changed.add(string);
            }
        }
    }
    return has_changed;
}

export async function update_folder_elements_recursively(display: Display, file_path: string = '/'): Promise<number> {
    const new_folder_elements = await get_file_data(display.ip, file_path);
    if (new_folder_elements === null) return 0;
    all_files.update((files: Record<string, Record<string, FolderElement[]>>) => {
        if (!files.hasOwnProperty(file_path)) {
            files[file_path] = {};
        }
        if (!files[file_path].hasOwnProperty(display.id)) {
            files[file_path][display.id] = [];
        }

        const existing_folder_elements = files[file_path].hasOwnProperty(display.id) ? files[file_path][display.id] : [];

        const diff = get_folder_elements_difference(existing_folder_elements, new_folder_elements);
        // Generate Thumbnails:
        setTimeout(async () => {
            for (const folder_element of diff.new) {
                await generate_thumbnail(display.ip, file_path, folder_element);
            }
        }, 0)

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



export function get_current_folder_elements(all_files: Record<string, Record<string, FolderElement[]>>, current_file_path: string, selected_display_ids: string[]) {
    if (!all_files.hasOwnProperty(current_file_path)) return [];

    const files_on_display_array = all_files[current_file_path];
    const files: FolderElement[] = [];
    for (const key of Object.keys(files_on_display_array)) {
        if (selected_display_ids.includes(key)) {
            FileOnDisplay:
            for (const file_on_display of files_on_display_array[key]) {
                for (const existing_file of files) {
                    const both_same_folder = file_on_display.type === "inode/directory" && existing_file.type === "inode/directory" && file_on_display.name === existing_file.name;
                    if (both_same_folder && file_on_display.size !== existing_file.size) {
                        existing_file.size = -1;
                    }
                    if (file_on_display.hash === existing_file.hash) {
                        continue FileOnDisplay;
                    } else if (both_same_folder) {
                        existing_file.date_created = null;
                        continue FileOnDisplay;
                    }
                }
                files.push({ ...file_on_display });
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
        if (!b.date_created || !a.date_created) return -1;
        return b.date_created.getTime() - a.date_created.getTime();
    });
    return files;
}

export function get_file_by_id(file_id: string, all_files: Record<string, Record<string, FolderElement[]>>, current_file_path: string, only_from_selected_displays: boolean = false): FolderElement | null {
    let current_path_elements: Record<string, FolderElement[]> | undefined = all_files[current_file_path];
    if (!current_path_elements) return null;
    if (only_from_selected_displays) {
        current_path_elements = Object.fromEntries(
            Object.entries(current_path_elements).filter(([key]) => get(selected_file_ids).includes(key))
        );
    }
    const all_folder_elements = Object.values(current_path_elements).flat();
    const found = all_folder_elements.find(el => el.id === file_id);
    if (!found) return null;
    return found
}

export async function run_for_selected_files_on_selected_displays(action: (ip: string, file_names: string[]) => Promise<void>): Promise<void> {
    const files = get(all_files);
    const file_path = get(current_file_path);
    const folder_elements: FolderElement[] = get(selected_file_ids)
        .map((file_id) => get_file_by_id(file_id, files, file_path))
        .filter((element) => element !== null);
    const folder_element_hashs = folder_elements
        .map((folder_element) => folder_element.hash)
        .filter((hash) => hash !== null);

    for (const display_id of get(selected_display_ids)) {
        if (!files[file_path].hasOwnProperty(display_id)) continue;
        const files_on_display = files[file_path][display_id];

        const selected_file_names_on_display: string[] = files_on_display
            .filter((e) => (e.hash && folder_element_hashs.includes(e.hash)) || (e.type === 'inode/directory' && folder_elements.some(e2 => e2.name === e.name && e2.type === 'inode/directory')))
            .map((folder_element) => folder_element.name);
        if (selected_file_names_on_display.length === 0) continue;

        const display = get_display_by_id(display_id, get(displays));
        if (!display) continue;

        await action(display.ip, selected_file_names_on_display);
    }

}

export function get_longest_existing_path_and_needed_parts(path: string, display_id: string, all_files: Record<string, Record<string, FolderElement[]>>): { existing: string; needed: string[] } {
    const path_parts = path.slice(1, path.length - 1).split('/').filter(e => e.length !== 0); // remove front and back / and split after that, then remove empty strings
    for (let i = path_parts.length; i > 0; i--) {
        const current_path = '/' + [...path_parts].splice(0, i).join('/') + '/';;
        if (all_files.hasOwnProperty(current_path)) {
            if (all_files[current_path].hasOwnProperty(display_id)) {
                return { existing: current_path, needed: [...path_parts].splice(i) };
            }
        }
    }
    return { existing: '/', needed: path_parts };
}