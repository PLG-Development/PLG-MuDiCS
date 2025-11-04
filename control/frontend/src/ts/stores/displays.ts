import { get, writable, type Writable } from "svelte/store";
import type { Display, DisplayGroup } from "../types";
import { is_selected, select, selected_display_ids } from "./select";
import { get_uuid, image_content_hash } from "../utils";
import { get_screenshot } from "../api_handler";

export const displays: Writable<DisplayGroup[]> = writable<DisplayGroup[]>([{
    id: get_uuid(),
    data: []
}]);


export function is_display_name_taken(name: string): boolean {
    const display_groups = get(displays);
    return display_groups.some(group =>
        group.data.some(display => display.name.trim().toLowerCase() === name.trim().toLowerCase())
    );
}

export function add_display(ip: string, mac: string | null, name: string, status: string) {
    displays.update((displays: DisplayGroup[]) => {
        displays[0].data.push({ id: get_uuid(), ip, preview_url: null, preview_timeout_id: null, mac, name, status });
        return displays;
    });
}

export function edit_display_data(display_id: string, ip: string, mac: string | null, name: string) {
    displays.update((display_groups) =>
        display_groups.map((group) => ({
            ...group,
            data: group.data.map((display) => {
                if (display.id !== display_id) return display;
                return { ...display, ip: ip, mac: mac, name: name };
            }),
        }))
    );
}

export function remove_display(display_id: string) {
    console.log(display_id);
    displays.update((displays: DisplayGroup[]) => {
        displays = displays.map(display_group => ({
            ...display_group,
            data: display_group.data.filter(display => display.id !== display_id)
        }));
        return displays;
    });

    // TODO remove ID from Files usw.
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

export function get_display_by_id(display_id: string, display_group_array: DisplayGroup[]) {
    const displays_array = display_group_array;
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

export async function update_screenshot(display_id: string, check_type: "first_check" | "last_check_different" | "last_check_same" = "first_check") {
    const display_ip = get_display_by_id(display_id, get(displays))?.ip;
    if (!display_ip) return;
    const new_blob = await get_screenshot(display_ip);
    const display = get_display_by_id(display_id, get(displays));

    let update_needed = check_type === "first_check";
    if (check_type !== "first_check") {
        if (display && display.preview_url) {
            const old_blob = await fetch(display.preview_url).then(r => r.blob());
            const new_hash = await image_content_hash(new_blob);
            const old_hash = await image_content_hash(old_blob);
            console.log(old_hash, new_hash);
            update_needed = old_hash !== new_hash; // if different -> update
        }
    }

    let new_preview_timeout_id: number | null = null;
    if (update_needed || check_type === "last_check_different") {
        new_preview_timeout_id = setTimeout(async () => { await update_screenshot(display_id, update_needed ? "last_check_different" : "last_check_same") }, 2 * 1000);
    }
    if (display?.preview_timeout_id) {
        clearInterval(display.preview_timeout_id);
    }

    if (update_needed) {
        displays.update((display_groups) =>
            display_groups.map((group) => ({
                ...group,
                data: group.data.map((display) => {
                    if (display.id !== display_id) return display;
                    if (display.preview_url) {
                        URL.revokeObjectURL(display.preview_url);
                    }
                    const new_url = URL.createObjectURL(new_blob);
                    return { ...display, preview_url: new_url, preview_timeout_id: new_preview_timeout_id };
                }),
            }))
        );
    }
}





add_testing_displays();
function add_testing_displays() {
    // const names = ["Vorne Rechts", "Vorne Links", "Vorne Mitte", "Fernseher Rechts", "Fernseher Bühne", "UIUIUIUIUIUIUISEHRLANGERTEXT DER IST WIRKLICH LANG, DER TEXT, so lang, dass er wirklich nirgendswo hinpasst, nichtmal da oben /\\"];
    // for (const name of names) {
    //     add_display("127.0.0.1", "00:1A:2B:3C:4D:5E", name, "Offline");
    // }

    add_display("127.0.0.1", "00:1A:2B:3C:4D:5E", "PC", "Offline");
    // add_display("192.168.178.111", "D4:81:D7:C0:DF:3C", "Laptop", "Online");
}