import { get, writable, type Writable } from "svelte/store";
import type { FolderElement } from "../types";
import { displays } from "./displays";
import { selected_display_ids, selected_file_ids } from "./select";
import { get_file_data } from "../api_handler";

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


export function updates_files_on_display(display_id: string, new_folder_elements: FolderElement[], file_path: string) {
    all_files.update((files) => {
        if (!files.hasOwnProperty(file_path)) {
            files[file_path] = {};
        }
        for (const new_folder_element of new_folder_elements) {
            new_folder_element.id = crypto.randomUUID();
        }
        files[file_path][display_id] = new_folder_elements;
        return files;
    });
}

function get_files_on_all_displays() {
    for (const display_group of get(displays)) {
        for (const display of display_group.data) {
            get_file_data(display.ip)
        }
    }
}


export function get_current_folder_elements(all_files: Record<string, Record<string, FolderElement[]>>, current_file_path: string, selected_display_ids: string[]) {
    if (!all_files.hasOwnProperty(current_file_path)) {
        get_files_on_all_displays();
        return [];
    }
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






add_test_files();
export function add_test_files() {
    // updates_files_on_display(get(displays)[0].data[0].id, [
    //     {
    //         hash: "ok",
    //         thumbnail: null,
    //         name: "ok.png",
    //         type: "image/png",
    //         date_created: new Date("2022-09-10"),
    //         size: "32 KB"
    //     },
    //     {
    //         hash: "schön",
    //         thumbnail: null,
    //         name: "schön.png",
    //         type: "image/png",
    //         date_created: new Date("2023-09-10"),
    //         size: "2 GB"
    //     },
    //     {
    //         hash: "lang",
    //         thumbnail: null,
    //         name: "langer Bildname der wirklich gar nicht mehr aufhört, sodass man mal gut testen kann, wie die UI darauf reagiert.odp",
    //         type: "application/vnd.oasis.opendocument.presentation",
    //         date_created: new Date("2028-09-10"),
    //         size: "324 KB"
    //     },
    //     {
    //         hash: "Schön hier aber waren Sie mal in Baden Würtemberg?",
    //         thumbnail: null,
    //         name: "Schön hier aber waren Sie mal in Baden Würtemberg?.mp4",
    //         type: "video/mp4",
    //         date_created: new Date("2024-09-10"),
    //         size: "32 KB"
    //     },
    //     {
    //         hash: "lan4234g",
    //         thumbnail: null,
    //         name: "Ein schöner Ordner",
    //         type: 'inode/directory',
    //         date_created: new Date("2025-01-02"),
    //         size: "324 TB"
    //     },
    //     {
    //         hash: "Schön hi23424er aber waren Sie mal in Baden Würtemberg?",
    //         thumbnail: null,
    //         name: "Ein hässlicher Ordner",
    //         type: 'inode/directory',
    //         date_created: new Date("2025-10-22"),
    //         size: "1 B"
    //     },
    // ], '/');


    // updates_files_on_display(get(displays)[0].data[0].id, [
    //     {
    //         hash: "ok",
    //         thumbnail: null,
    //         name: "ok.png",
    //         type: "image/png",
    //         date_created: new Date("2022-09-10"),
    //         size: "32 KB"
    //     },
    //     {
    //         hash: "schön",
    //         thumbnail: null,
    //         name: "schön.png",
    //         type: "image/png",
    //         date_created: new Date("2023-09-10"),
    //         size: "2 GB"
    //     },
    // ], '/Ein hässlicher Ordner/');

    // updates_files_on_display(get(displays)[0].data[0].id, [
    //     {
    //         hash: "nö",
    //         thumbnail: null,
    //         name: "nö.png",
    //         type: "image/png",
    //         date_created: new Date("2022-09-10"),
    //         size: "32 KB"
    //     },
    //     {
    //         hash: "na gut",
    //         thumbnail: null,
    //         name: "na gut.png",
    //         type: "image/png",
    //         date_created: new Date("2023-09-10"),
    //         size: "2 GB"
    //     },
    // ], '/Ein schöner Ordner/');



    // updates_files_on_display(get(displays)[0].data[1].id, [
    //     {
    //         hash: "okk",
    //         thumbnail: null,
    //         name: "ok.png",
    //         type: "image/png",
    //         date_created: new Date("2022-09-10"),
    //         size: "32 KB"
    //     },
    //     {
    //         hash: "schön",
    //         thumbnail: null,
    //         name: "schön.png",
    //         type: "image/png",
    //         date_created: new Date("2023-09-10"),
    //         size: "2 GB"
    //     },], '/');
}
