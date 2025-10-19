import type { NumericRange } from "@sveltejs/kit";
import { get, writable, type Writable } from "svelte/store";

const screen_height_step_size = 5;
export const dnd_flip_duration_ms = 300;

const min_display_screen_height = 15;
const max_display_screen_height = 40;
export const display_screen_height: Writable<number> = writable<number>(25);

export const is_group_drag: Writable<boolean> = writable<boolean>(false);
export const is_display_drag: Writable<boolean> = writable<boolean>(false);

export const pinned_display_id: Writable<string | null> = writable<string | null>(null);

export function change_display_screen_height(factor: number) {
    display_screen_height.update((current_height) => {
        const new_size = current_height + (factor * screen_height_step_size);
        if (new_size > max_display_screen_height || new_size < min_display_screen_height) {
            return current_height;
        } else {
            return new_size;
        }
    });
}


export function next_step_possible(current_height: number, factor: number) {
    const new_size = current_height + (factor * screen_height_step_size);
    return new_size > max_display_screen_height || new_size < min_display_screen_height;
}


export function get_selectable_color_classes(
    selected: boolean,
    returning_classes: { bg?: boolean; hover?: boolean; active?: boolean; text?: boolean } = {},
    base_bg_distance: number = 0,
    shifted_distance: number = 0
) {
    let base_bg = selected ? 'bg-stone-400' : 'bg-stone-600';
    const base_text = selected ? 'text-stone-950' : 'text-stone-200';
    base_bg = get_shifted_color(base_bg, base_bg_distance);

    const { bg = false, hover = false, active = false, text = false } = returning_classes;

    const out: string[] = [];
    if (bg) out.push(base_bg);
    if (hover) out.push('hover:' + get_shifted_color(base_bg, 100 + shifted_distance));
    if (active) out.push('active:' + get_shifted_color(base_bg, 150 + shifted_distance));
    if (text) out.push(base_text);

    return out.join(' ');
}

export function get_shifted_color(base_color: string, distance: number): string {
    return base_color.replace(/(\d+)(?=(?:\/\d+)?$)/, (m: string) => String(+Number(m) - distance));
}