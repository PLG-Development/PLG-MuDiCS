import { get } from "svelte/store";
import { displays, run_on_all_selected_displays, update_displays_with_map, update_screenshot } from "./stores/displays"
import { ping_ip } from "./api_handler";
import type { Display } from "./types";
import { change_file_path, update_folder_elements_recursively } from "./stores/files";
import { db } from "./indexdb/file_thumbnails.db";

const update_display_status_interval_seconds = 20;

export async function on_start() {
    await db.thumbnail_blobs.clear();
    await update_all_display_status();
    await setInterval(update_all_display_status, update_display_status_interval_seconds * 1000);

}


async function update_all_display_status() {
    await update_displays_with_map(async (display: Display) => {
        const new_status = await ping_ip(display.ip);
        if (new_status === null && display.status !== null) return display;
        if (new_status === "app_online" && display.status !== "app_online") {
            await on_display_start(display);
        }
        return { ...display, status: new_status, };
    });
    console.log("Display Status updated")
}


async function on_display_start(display: Display) {
    await update_folder_elements_recursively(display, '/');
    await update_screenshot(display.id); 
}