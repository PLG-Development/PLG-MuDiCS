import { writable, type Writable } from "svelte/store";

export const selected_file_ids: Writable<string[]> = writable<string[]>([]);
export const selected_display_ids: Writable<string[]> = writable<string[]>([]);


export function select(selected_ids: Writable<string[]>, id: string, new_value: boolean | null = null) {
    selected_ids.update((all_ids: string[]) => {
        if (all_ids.includes(id)) {
            const index = all_ids.indexOf(id);
            if (index > -1 && new_value !== true) {
                all_ids.splice(index, 1);
            }
        } else if (new_value !== false) {
            all_ids.push(id);
        }
        return all_ids;
    });
}

export function is_selected(id: string, selected_ids: string[]): boolean {
    return selected_ids.includes(id);
}
