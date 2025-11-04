<script lang="ts">
	import { fade, scale, slide } from 'svelte/transition';
	import {
		all_displays_of_group_selected,
		displays,
		get_display_by_id,
		select_all_of_group
	} from '../ts/stores/displays';
	import {
		change_height,
		current_height,
		dnd_flip_duration_ms,
		get_selectable_color_classes,
		is_display_drag,
		is_group_drag,
		next_height_step_size,
		pinned_display_id
	} from '../ts/stores/ui_behavior';
	import { type Display, type DisplayGroup } from '../ts/types';
	import Button from './Button.svelte';
	import OnlineState from './OnlineState.svelte';
	import { cubicOut } from 'svelte/easing';
	import { Menu, Minus, Pencil, PinOff, Plus, Settings, Trash2, VideoOff } from 'lucide-svelte';
	import { selected_display_ids } from '../ts/stores/select';
	import { dragHandleZone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import DisplayGroupObject from './DisplayGroupObject.svelte';

	let displays_scroll_box: HTMLElement;
	let pinned_display: Display | null = $derived(
		get_display_by_id($pinned_display_id || '', $displays)
	);

	function select_all(current_displays: DisplayGroup[], current_selected_display_ids: string[]) {
		const new_value = !all_selected(current_displays, current_selected_display_ids);
		for (const display_group of current_displays) {
			select_all_of_group(display_group, new_value);
		}
	}

	function all_selected(current_displays: DisplayGroup[], current_selected_display_ids: string[]) {
		for (const display_group of current_displays) {
			if (!all_displays_of_group_selected(display_group, current_selected_display_ids)) {
				return false;
			}
		}
		return true;
	}

	function on_wheel(e: WheelEvent) {
		if (!$is_group_drag && !$is_display_drag) return;
		if (!displays_scroll_box) return;

		// apply custom scroll feature
		e.preventDefault();
		(displays_scroll_box as HTMLElement).scrollBy?.({
			top: e.deltaY,
			behavior: 'auto'
		});
	}
</script>

<svelte:window on:wheel={on_wheel} />

<div class="h-[calc(100dvh-3rem-(6*var(--spacing)))] flex flex-col gap-2">
	{#if $pinned_display_id}
		<!-- Pinned Item -->
		<div in:fade={{ duration: 140 }} out:fade={{ duration: 120 }}>
			<div
				class="grid grid-rows-[2.5rem_auto] will-change-[height,opacity] overflow-hidden rounded-2xl"
				transition:slide={{ duration: 260, easing: cubicOut }}
			>
				<div class="bg-stone-700 flex justify-between w-full p-1 min-w-0 basis-0 flex-1">
					<span
						class="text-xl font-bold pl-2 content-center truncate min-w-0"
						title={pinned_display?.name}
					>
						{pinned_display?.name}
					</span>
					<div class="flex flex-row gap-1">
						<OnlineState
							selected={false}
							status={pinned_display?.status ?? ''}
							className="flex items-center px-2"
						/>
						<Button
							className="aspect-square !p-1"
							bg="bg-stone-600"
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
									class: 'text-red-400 hover:text-stone-200 hover:!bg-red-400 active:!bg-red-500'
								}
							]}
						>
							<Menu />
						</Button>

						<Button
							title="Bildschirm nicht mehr anpinnen"
							className="aspect-square !p-1"
							bg="bg-stone-600"
							click_function={() => {
								$pinned_display_id = null;
							}}
						>
							<PinOff />
						</Button>
					</div>
				</div>

				<div class="w-full h-[30dvh] bg-stone-800 flex justify-center items-center">
					{#if pinned_display?.preview_url}
						<img
							src={pinned_display.preview_url}
							alt="preview"
							class="max-h-full max-w-full object-cover bg-black"
						/>
					{:else}
						<div class="size-full bg-black flex justify-center items-center">
							<VideoOff class="size-[20%]" />
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<div class="min-h-0 h-full grid grid-rows-[2.5rem_auto] bg-stone-800 rounded-2xl overflow-hidden">
		<!-- Normal Heading Left -->
		<div class="bg-stone-700 flex justify-between w-full p-1 gap-2 min-w-0">
			<span class="text-xl font-bold pl-2 content-center truncate min-w-0">
				Verbundene Bildschirme
			</span>
			<div class="flex flex-row gap-1">
				<button
					class="gap-2 min-w-40 px-4 rounded-xl cursor-pointer duration-200 transition-colors {get_selectable_color_classes(
						all_selected($displays, $selected_display_ids),
						{
							bg: true,
							hover: true,
							active: true,
							text: true
						}
					)}"
					onclick={() => select_all($displays, $selected_display_ids)}
				>
					<span
						>{all_selected($displays, $selected_display_ids)
							? 'Alle abwählen'
							: 'Alle auswählen'}</span
					>
				</button>
				<div class="flex flex-ro">
					<Button
						title="Bildschirme größer darstellen"
						className="aspect-square !p-1 rounded-r-none"
						bg="bg-stone-600"
						disabled={!Boolean(next_height_step_size('display', $current_height, 1))}
						click_function={() => {
							change_height('display', 1);
						}}
					>
						<Plus />
					</Button>
					<Button
						title="Bildschirme kleiner darstellen"
						className="aspect-square !p-1 rounded-l-none"
						bg="bg-stone-600"
						disabled={!Boolean(next_height_step_size('display', $current_height, -1))}
						click_function={() => {
							change_height('display', -1);
						}}
					>
						<Minus />
					</Button>
				</div>
			</div>
		</div>
		<div class="min-h-0 overflow-y-auto" bind:this={displays_scroll_box}>
			<div
				class="min-h-full p-2 flex flex-col gap-4"
				use:dragHandleZone={{
					items: $displays,
					type: 'group',
					flipDurationMs: dnd_flip_duration_ms,
					dropFromOthersDisabled: true,
					dropTargetStyle: { outline: 'none' }
				}}
				onconsider={(e: CustomEvent) => {
					$is_group_drag = true;
					$displays = e.detail.items;
				}}
				onfinalize={(e: CustomEvent) => {
					$displays = e.detail.items;
					$is_group_drag = false;
				}}
			>
				{#if $displays.length === 1 && $displays[0].data.length === 0}
					<div class="text-stone-500 px-10 py-6 leading-relaxed text-center">
						Es wurden noch keine Bildschirme hinzugefügt. Klicke oben rechts auf <Settings class="inline pb-1"/> und "Neuen
						Bildschirm hinzufügen".
					</div>
				{:else}
					{#each $displays as display_group (display_group.id)}
						<!-- Each Group -->
						<section
							out:scale={{ duration: dnd_flip_duration_ms, easing: cubicOut }}
							animate:flip={{ duration: dnd_flip_duration_ms, easing: cubicOut }}
							class="outline-none"
						>
							<DisplayGroupObject {display_group} />
						</section>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>
