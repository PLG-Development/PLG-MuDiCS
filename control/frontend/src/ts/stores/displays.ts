import { get, writable, type Writable } from "svelte/store";
import type { Display, DisplayGroup } from "../types";
import { is_selected, select, selected_display_ids } from "./select";
import { get_uuid } from "../utils";

export const displays: Writable<DisplayGroup[]> = writable<DisplayGroup[]>([{
    id: get_uuid(),
    data: []
}]);


function add_display(ip: string, mac: string, name: string, status: string) {
    displays.update((displays: DisplayGroup[]) => {
        displays[0].data.push({ id: get_uuid(), ip, mac, name, status });
        return displays;
    });
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
        select(selected_display_ids, display.id, new_value);
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
            id: get_uuid(),
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



add_testing_displays();
function add_testing_displays() {
    // const names = ["Vorne Rechts", "Vorne Links", "Vorne Mitte", "Fernseher Rechts", "Fernseher Bühne", "UIUIUIUIUIUIUISEHRLANGERTEXT DER IST WIRKLICH LANG, DER TEXT, so lang, dass er wirklich nirgendswo hinpasst, nichtmal da oben /\\"];
    // for (const name of names) {
    //     add_display("127.0.0.1", "00:1A:2B:3C:4D:5E", name, "Offline");
    // }

    add_display("127.0.0.1", "00:1A:2B:3C:4D:5E", "Test", "Offline")
}