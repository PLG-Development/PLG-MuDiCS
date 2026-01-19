import { get, writable, type Writable } from 'svelte/store';
import { online_displays, selected_online_display_ids } from './displays';

export const selected_file_ids: Writable<string[]> = writable<string[]>([]); // JSON.stringify([string, string, number, string])
export const selected_display_ids: Writable<string[]> = writable<string[]>([]);

export function select(
	selected_ids: Writable<string[]>,
	id: string,
	action: 'toggle' | 'select' | 'deselect'
) {
	selected_ids.update((all_ids: string[]) => {
		if (all_ids.includes(id)) {
			const index = all_ids.indexOf(id);
			if (index > -1 && action !== 'select') {
				all_ids.splice(index, 1);
			}
		} else if (action !== 'deselect') {
			all_ids.push(id);
		}
		return all_ids;
	});
	
	if (selected_ids === selected_display_ids) {
		const current_online_display_ids = get(online_displays).map((d) => d.id);
		selected_online_display_ids.set(get(selected_display_ids).filter((id) => current_online_display_ids.includes(id)));
		console.log(get(selected_online_display_ids))
	}
}

export function is_selected(id: string, selected_ids: string[]): boolean {
	return selected_ids.includes(id);
}
