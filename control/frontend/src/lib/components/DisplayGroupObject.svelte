<script lang="ts">
	import { dragHandleZone, TRIGGERS } from 'svelte-dnd-action';
	import {
		dnd_flip_duration_ms,
		get_selectable_color_classes,
		is_display_drag,
		is_group_drag
	} from '$lib/ts/stores/ui_behavior';
	import { cubicOut } from 'svelte/easing';
	import { flip } from 'svelte/animate';
	import DisplayObject from './DisplayObject.svelte';
	import {
		all_displays_of_group_selected,
		set_select_for_group,
		update_db_displays,
		local_displays,
		set_new_display_order,
	} from '$lib/ts/stores/displays';
	import DNDGrip from '$lib/components/DNDGrip.svelte';
	import { fade } from 'svelte/transition';
	import type { Display, DisplayIdGroup, MenuOption } from '$lib/ts/types';
	import { selected_display_ids } from '$lib/ts/stores/select';
	import { liveQuery, type Observable } from 'dexie';
	import { onMount } from 'svelte';
	import { get_uuid } from '$lib/ts/utils';

	let {
		display_id_group,
		get_display_menu_options,
		close_pinned_display
	}: {
		display_id_group: DisplayIdGroup;
		get_display_menu_options: (display_id: string) => MenuOption[];
		close_pinned_display: () => void;
	} = $props();

	let all_selected: Observable<boolean> | undefined = $state();
	$effect(() => {
		const sdi = $selected_display_ids;
		all_selected = liveQuery(() => all_displays_of_group_selected(display_id_group.id, sdi));
	});

	let hovering_selectable = $state(false);

	async function select_all_of_this_group() {
		const new_value = !($all_selected || false);
		await set_select_for_group(display_id_group.id, new_value);
	}

	async function handle_consider(e: CustomEvent) {
		const { items, info } = e.detail;

		if (items.length !== 1 && info.trigger === TRIGGERS.DRAG_STARTED) {
			$is_display_drag = true;
			// add empty display group if its not just one group
			if (!($local_displays.length === 1 && $local_displays[0].displays.length === 1)) {
				$local_displays.push({
					id: get_uuid(),
					displays: []
				});
			}
		}
		set_new_display_order(display_id_group.id, items);
	}

	async function handle_finalize(e: CustomEvent) {
		set_new_display_order(display_id_group.id, e.detail.items);
		// $local_displays = $local_displays.filter((g) => g.displays.length !== 0);
		await update_db_displays();
		$is_display_drag = false;
	}
</script>

<div
	transition:fade={{ duration: 100 }}
	class="{get_selectable_color_classes(
		$all_selected || false,
		{
			bg: true,
			hover: hovering_selectable,
			active: hovering_selectable,
			text: true
		},
		-150,
		-50
	)} transition-colors duration-200 rounded-2xl flex flex-row cursor-pointer"
>
	<div
		class="flex flex-col min-w-0 pl-2 py-2 gap-2 w-full"
		use:dragHandleZone={{
			items: display_id_group.displays,
			type: 'item',
			flipDurationMs: dnd_flip_duration_ms,
			dropTargetStyle: { outline: 'none' }
		}}
		onconsider={handle_consider}
		onfinalize={handle_finalize}
	>
		{#each display_id_group.displays as display_id_object (display_id_object.id)}
			<!-- Each Group -->
			<section class="outline-none" role="figure">
				<!-- animate:flip={{ duration: $is_group_drag ? 0 : dnd_flip_duration_ms, easing: cubicOut }} -->
				<DisplayObject {display_id_object} {get_display_menu_options} {close_pinned_display} />
			</section>
		{/each}

		{#if display_id_group.displays.length === 0}
			<div class="min-h-10 h-full w-full pl-2 py-2 flex justify-center items-center">
				Hier in leere neue Gruppe ablegen
			</div>
		{/if}
	</div>
	<div
		class="flex items-center justify-center px-2"
		onclick={select_all_of_this_group}
		role="button"
		tabindex="0"
		onkeydown={async (e) => {
			if (e.key === 'Enter' || e.key === ' ') await select_all_of_this_group();
		}}
		onmouseenter={() => (hovering_selectable = true)}
		onmouseleave={() => (hovering_selectable = false)}
	>
		<DNDGrip
			bg={get_selectable_color_classes(
				$all_selected || false,
				{
					bg: true
				},
				-150
			)}
		/>
	</div>
</div>
