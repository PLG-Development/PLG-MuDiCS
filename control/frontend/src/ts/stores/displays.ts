import { get, writable, type Writable } from "svelte/store";

export const displays: Writable<DisplayGroup[]> = writable<DisplayGroup[]>([{
    id: crypto.randomUUID(),
    data: []
}]);

export const selected_display_ids: Writable<string[]> = writable<string[]>([]);


add_testing_displays();

function add_display(ip: string, mac: string, name: string, status: string) {
    displays.update((displays: DisplayGroup[]) => {
        displays[0].data.push({ id: crypto.randomUUID(), ip, mac, name, status });
        return displays;
    });
}

export function select(display_id: string, new_value: boolean | null = null) {
    selected_display_ids.update((all_ids: string[]) => {
        if (all_ids.includes(display_id)) {
            const index = all_ids.indexOf(display_id);
            if (index > -1 && new_value !== true) {
                all_ids.splice(index, 1);
            }
        } else if (new_value !== false) {
            all_ids.push(display_id);
        }
        return all_ids;
    });
}

export function is_selected(display_id: string, current_selected_display_ids: string[]): boolean {
    return current_selected_display_ids.includes(display_id);
}

export function all_displays_of_group_selected(display_group: DisplayGroup, current_selected_displays: string[]) {
    if (display_group.data.length === 0) return false;
    for (const display of display_group.data) {
        if (!is_selected(display.id, current_selected_displays)) {
            return false;
        }
    }
    return true;
}

export function select_all_of_group(display_group: DisplayGroup, new_value: boolean | null = null) {
    for (const display of display_group.data) {
        select(display.id, new_value);
    }
}

export function set_new_display_group_data(display_group_id: string, new_data: Display[]) {
    displays.update((displays: DisplayGroup[]) => {
        for (const display_group of displays) {
            if (display_group.id === display_group_id) {
                display_group.data = new_data;
            }
        }
        return displays;
    });
}

export function get_display_by_id(display_id: string) {
    const displays_array = get(displays);
    for (const display_group of displays_array) {
        for (const display of display_group.data) {
            if (display.id === display_id) {
                return display;
            }
        }
    }
    return null;
}


export function add_empty_display_group() {
    displays.update((displays: DisplayGroup[]) => {
        displays.push({
            id: crypto.randomUUID(),
            data: [],
        });
        return displays;
    });
}


export function remove_empty_display_groups() {
    displays.update((displays: DisplayGroup[]) => {
        for (let i = displays.length - 1; i >= 0; i--) {
            if (displays[i].data.length === 0) {
                displays.splice(i, 1);
            }
        }
        return displays;
    });
}




function add_testing_displays() {
    const names = ["Vorne Rechts", "Vorne Links", "Vorne Mitte", "Fernseher Rechts", "Fernseher Bühne", "UIUIUIUIUIUIUISEHRLANGERTEXT DER IST WIRKLICH LANG, DER TEXT, so lang, dass er wirklich nirgendswo hinpasst, nichtmal da oben /\\"];
    for (const name of names) {
        add_display("192.168.1.42", "00:1A:2B:3C:4D:5E", name, "Offline");
    }
}