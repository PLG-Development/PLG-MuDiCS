import { writable, type Writable } from "svelte/store";

export const dnd_flip_duration_ms = 300;

const heights_options: Record<string, { min: number; max: number; step: number }> = {
    display: {
        min: 15,
        max: 40,
        step: 5,
    },
    file: {
        min: 10,
        max: 20,
        step: 5,
    }
}

export const current_height: Writable<Record<string, number>> = writable<Record<string, number>>({
    display: 25,
    file: 10,
});


export const is_group_drag: Writable<boolean> = writable<boolean>(false);
export const is_display_drag: Writable<boolean> = writable<boolean>(false);

export const pinned_display_id: Writable<string | null> = writable<string | null>(null);


export function change_height(key: 'display' | 'file', factor: number) {
    current_height.update((height) => {
        height[key] = next_height_step_size(key, height, factor) || height[key];
        return height;
    });
}

export function next_height_step_size(key: 'display' | 'file', current_height_array: Record<string, number>, factor: number): number {
    const new_size = current_height_array[key] + (factor * heights_options[key].step);
    if (new_size > heights_options[key].max || new_size < heights_options[key].min) {
        return 0;
    } else {
        return new_size;
    }
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