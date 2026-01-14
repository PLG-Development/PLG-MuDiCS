<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import {
		current_height,
		get_selectable_color_classes,
		pinned_display_id
	} from '$lib/ts/stores/ui_behavior';
	import DNDGrip from '$lib/components/DNDGrip.svelte';
	import { Menu, Pin, PinOff, VideoOff } from 'lucide-svelte';
	import OnlineState from './OnlineState.svelte';
	import type { Display, DisplayIdObject, MenuOption } from '$lib/ts/types';
	import { is_selected, select, selected_display_ids } from '$lib/ts/stores/select';
	import { get_display_by_id, screenshot_loop } from '$lib/ts/stores/displays';
	import { change_file_path, current_file_path } from '$lib/ts/stores/files';
	import { liveQuery } from 'dexie';

	let {
		display_id_object,
		get_display_menu_options,
		close_pinned_display
	}: {
		display_id_object: DisplayIdObject;
		get_display_menu_options: (display_id: string) => MenuOption[];
		close_pinned_display: () => void;
	} = $props();

	let hovering_unselectable = $state(false);
	let display = liveQuery(() => get_display_by_id(display_id_object.id));

	async function onclick(e: Event) {
		e.stopPropagation();
		select(selected_display_ids, display_id_object.id, 'toggle');

		// force file view update
		await change_file_path($current_file_path);
	}

	async function on_preview_click(e: MouseEvent) {
		if ($pinned_display_id === display_id_object.id) {
			close_pinned_display();
		} else {
			$pinned_display_id = display_id_object.id;
		}
		await screenshot_loop(display_id_object.id);
		e.stopPropagation();
	}
</script>

<div
	data-testid="display"
	role="button"
	tabindex="0"
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') onclick(e);
	}}
	{onclick}
	class="p-1 {get_selectable_color_classes(is_selected(display_id_object.id, $selected_display_ids), {
		bg: true,
		hover: true,
		active: !hovering_unselectable,
		text: true
	})} rounded-xl flex flex-row justify-between h-{$current_height.display} transition-colors duration-100 gap-2 cursor-pointer w-full text-stone-200"
>
	<div class="flex flex-row gap-4 min-w-0 flex-1">
		<!-- Left Preview Screen -->
		<button
			class="group relative aspect-video bg-stone-800 h-full rounded-lg overflow-hidden cursor-pointer text-stone-200 transition-colors duration-200"
			onmouseenter={() => (hovering_unselectable = true)}
			onmouseleave={() => (hovering_unselectable = false)}
			onclick={on_preview_click}
		>
			<div class="flex h-full w-full items-center justify-center">
				{#if $pinned_display_id === display_id_object.id}
					<div class="size-[50%]">
						<Pin class="size-full" />
					</div>
				{:else if $display && $display.preview.url}
					<img src={$display.preview.url} alt="preview" class="w-full object-cover bg-black" />
				{:else}
					<!-- No Signal -->
					<div class="size-full bg-black flex justify-center items-center">
						<VideoOff class="size-[30%]" />
					</div>
				{/if}
			</div>

			<!-- Hover Effect -->
			<span
				class="pointer-events-none absolute inset-0 {$pinned_display_id === display_id_object.id
					? 'bg-stone-700'
					: 'bg-stone-700/70'} opacity-0 transition-opacity duration-200 flex items-center justify-center group-hover:opacity-100"
			>
				{#if $pinned_display_id === display_id_object.id}
					<PinOff class="size-[50%]" aria-hidden="true" />
				{:else}
					<Pin class="size-[50%]" aria-hidden="true" />
				{/if}
			</span>
		</button>
		<!-- Middle Text Block -->
		<div
			class="h-full flex flex-col justify-center gap-1 select-none
                min-w-0 basis-0 flex-1"
		>
			<div class="text-xl font-bold truncate w-full" title={$display?.name ?? ''}>
				{$display?.name ?? ''}
			</div>

			<OnlineState
				selected={is_selected(display_id_object.id, $selected_display_ids)}
				status={$display?.status ?? null}
			/>
		</div>
	</div>
	<!-- Right Controls -->
	<div class="flex flex-row h-full items-center gap-2 pr-3">
		<DNDGrip
			bg={get_selectable_color_classes(is_selected(display_id_object.id, $selected_display_ids), {
				bg: true
			})}
		/>

		<div
			role="figure"
			onmouseenter={() => (hovering_unselectable = true)}
			onmouseleave={() => (hovering_unselectable = false)}
		>
			<Button
				bg="bg-transparent"
				hover_bg={get_selectable_color_classes(is_selected(display_id_object.id, $selected_display_ids), {
					bg: true
				})}
				active_bg={get_selectable_color_classes(is_selected(display_id_object.id, $selected_display_ids), {
					bg: true
				})}
				click_function={(e) => {
					e.stopPropagation();
				}}
				menu_options={get_display_menu_options(display_id_object.id)}
			>
				<Menu />
			</Button>
		</div>
	</div>
</div>
