<script lang="ts">
	import { dragHandleZone, TRIGGERS } from 'svelte-dnd-action';
	import {
		dnd_flip_duration_ms,
		get_selectable_color_classes,
		is_display_drag,
		is_group_drag
	} from '../ts/stores/ui_behavior';
	import { cubicOut } from 'svelte/easing';
	import { flip } from 'svelte/animate';
	import DisplayObject from './DisplayObject.svelte';
	import {
		add_empty_display_group,
		all_displays_of_group_selected,
		remove_empty_display_groups,
		select_all_of_group,
		set_new_display_group_data
	} from '../ts/stores/displays';
	import DNDGrip from './DNDGrip.svelte';
	import { fade } from 'svelte/transition';
	import type { DisplayGroup, MenuOption } from '../ts/types';
	import { selected_display_ids } from '../ts/stores/select';

	let { display_group, get_display_menu_options, close_pinned_display } = $props<{
		display_group: DisplayGroup;
		get_display_menu_options: (display_id: string) => MenuOption[];
		close_pinned_display: () => void;
	}>();

	let hovering_selectable = $state(false);

	function select_all_of_this_group() {
		const new_value = !all_displays_of_group_selected(display_group, $selected_display_ids);
		select_all_of_group(display_group, new_value);
	}

	function handle_consider(e: CustomEvent) {
		const { items, info } = e.detail;

		if (items.length !== 1 && info.trigger === TRIGGERS.DRAG_STARTED) {
			$is_display_drag = true;
			add_empty_display_group();
		}
		set_new_display_group_data(display_group.id, items);
	}

	function handle_finalize(e: CustomEvent) {
		remove_empty_display_groups();
		$is_display_drag = false;
		set_new_display_group_data(display_group.id, e.detail.items);
	}
</script>

<div
	transition:fade={{ duration: 100 }}
	class="{get_selectable_color_classes(
		all_displays_of_group_selected(display_group, $selected_display_ids),
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
			items: display_group.data,
			type: 'item',
			flipDurationMs: dnd_flip_duration_ms,
			dropTargetStyle: { outline: 'none' }
		}}
		onconsider={handle_consider}
		onfinalize={handle_finalize}
	>
		{#each display_group.data as display (display.id)}
			<!-- Each Group -->
			<section
				animate:flip={{ duration: $is_group_drag ? 0 : dnd_flip_duration_ms, easing: cubicOut }}
				class="outline-none"
				role="figure"
			>
				<DisplayObject {display} {get_display_menu_options} {close_pinned_display} />
			</section>
		{/each}

		{#if display_group.data.length === 0}
			<div class="min-h-10 h-full w-full pl-2 py-2 flex justify-center items-center">
				Hier in leere neue Gruppe ablegen
			</div>
		{/if}
	</div>
	<div
		class="flex items-center justify-center px-2"
		onclick={(e) => select_all_of_this_group()}
		role="button"
		tabindex="0"
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') select_all_of_this_group();
		}}
		onmouseenter={() => (hovering_selectable = true)}
		onmouseleave={() => (hovering_selectable = false)}
	>
		<DNDGrip
			bg={get_selectable_color_classes(
				all_displays_of_group_selected(display_group, $selected_display_ids),
				{
					bg: true
				},
				-150
			)}
		/>
	</div>
</div>
