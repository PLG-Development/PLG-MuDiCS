<script lang="ts">
	import Button from './Button.svelte';
	import {
	current_height,
		get_selectable_color_classes,
		pinned_display_id
	} from '../ts/stores/ui_behavior';
	import DNDGrip from './DNDGrip.svelte';
	import { Menu, Pencil, Pin, PinOff, Trash2, VideoOff, X } from 'lucide-svelte';
	import OnlineState from './OnlineState.svelte';
	import type { Display } from '../ts/types';
	import { is_selected, select, selected_display_ids } from '../ts/stores/select';

	let { display } = $props<{
		display: Display;
	}>();

	let hovering_unselectable = $state(false);

	function onclick(e: Event) {
		select(selected_display_ids, display.id);
		e.stopPropagation();
	}

	function on_preview_click(e: MouseEvent) {
		if ($pinned_display_id === display.id) {
			$pinned_display_id = null;
		} else {
			$pinned_display_id = display.id;
		}
		e.stopPropagation();
	}
</script>

<div
	role="button"
	tabindex="0"
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') onclick(e);
	}}
	{onclick}
	class="p-1 {get_selectable_color_classes(is_selected(display.id, $selected_display_ids), {
		bg: true,
		hover: true,
		active: !hovering_unselectable,
		text: true
	})} rounded-xl flex flex-row justify-between h-{$current_height.display} transition-colors duration-100 gap-2 cursor-pointer w-full text-stone-200"
>
	<div class="flex flex-row gap-4 min-w-0 flex-1">
		<!-- Left Preview Screen -->
		<button
			class="group relative aspect-16/9 {$pinned_display_id === display.id
				? 'bg-stone-800'
				: 'bg-black'} h-full rounded-lg overflow-hidden cursor-pointer text-stone-200 transition-colors duration-200"
			onmouseenter={() => (hovering_unselectable = true)}
			onmouseleave={() => (hovering_unselectable = false)}
			onclick={on_preview_click}
		>
			<div class="flex h-full w-full items-center justify-center">
				{#if $pinned_display_id === display.id}
					<div class="size-[50%]">
						<Pin class="size-full" />
					</div>
				{:else}
					<!-- No Signal -->
					<VideoOff class="size-[30%]" />
				{/if}
			</div>

			<!-- Hover Effect -->
			<span
				class="pointer-events-none absolute inset-0 {$pinned_display_id === display.id
					? 'bg-stone-700'
					: 'bg-stone-700/70'} opacity-0 transition-opacity duration-200 flex items-center justify-center group-hover:opacity-100"
			>
				{#if $pinned_display_id === display.id}
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
			<div class="text-xl font-bold truncate w-full" title={display.name}>
				{display.name}
			</div>

			<OnlineState
				selected={is_selected(display.id, $selected_display_ids)}
				status={display.status}
			/>
		</div>
	</div>
	<!-- Right Controls -->
	<div class="flex flex-row h-full items-center gap-2 pr-3">
		<DNDGrip
			bg={get_selectable_color_classes(is_selected(display.id, $selected_display_ids), {
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
				hover_bg={get_selectable_color_classes(is_selected(display.id, $selected_display_ids), {
					bg: true
				})}
				active_bg={get_selectable_color_classes(is_selected(display.id, $selected_display_ids), {
					bg: true
				})}
				click_function={(e) => {
					e.stopPropagation();
				}}
				menu_options={[
					{
						icon: Pencil,
						name: 'Bildschirm bearbeiten'
					},
					{
						icon: Trash2,
						name: 'Bildschirm löschen',
						class: 'text-red-400 hover:text-stone-200 hover:!bg-red-400'
					}
				]}
			>
				<Menu />
			</Button>
		</div>
	</div>
</div>
