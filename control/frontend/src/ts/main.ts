import { get } from "svelte/store";
import { displays, update_displays_with_map } from "./stores/displays"
import { ping_ip } from "./api_handler";
import type { Display } from "./types";
import { change_file_path } from "./stores/files";

const update_display_status_interval_seconds = 20;

export function on_start() {
    update_all_display_status();
    setInterval(update_all_display_status, update_display_status_interval_seconds * 1000);
}


async function update_all_display_status() {
    update_displays_with_map(async (display: Display) => {
        const new_status = await ping_ip(display.ip);
        if (new_status === null && display.status !== null) return display;
        return { ...display, status: new_status, };
    });
    console.log("Display Status updated")
}