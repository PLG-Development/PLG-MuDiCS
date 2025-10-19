<script lang="ts">
	import { Menu, Minus, PinOff, Plus, Settings, Square, VideoOff, X } from 'lucide-svelte';
	import Button from '../components/Button.svelte';
	import SplashScreen from '../components/SplashScreen.svelte';
	import {
		change_display_screen_height,
		display_screen_height,
		dnd_flip_duration_ms,
		get_selectable_color_classes,
		is_display_drag,
		is_group_drag,
		next_step_possible,
		pinned_display_id
	} from '../ts/stores/ui_behavior';
	import { dragHandleZone } from 'svelte-dnd-action';
	import {
		all_displays_of_group_selected,
		displays,
		get_display_by_id,
		is_selected,
		select_all_of_group,
		selected_display_ids
	} from '../ts/stores/displays';
	import { cubicOut } from 'svelte/easing';
	import { flip } from 'svelte/animate';
	import DisplayGroupObject from '../components/DisplayGroupObject.svelte';
	import { blur, draw, fade, fly, scale, slide } from 'svelte/transition';
	import OnlineState from '../components/OnlineState.svelte';
	import type { DisplayGroup } from '../ts/types';

	let displays_scroll_box: HTMLElement;

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

<main class="bg-stone-900 h-dvh w-dvw text-stone-200 p-4 gap-4 grid grid-rows-[3rem_auto]">
	<!-- <SplashScreen></SplashScreen> -->

	<div class="w-[calc(100dvw-(8*var(--spacing)))] flex justify-between">
		<span class="text-4xl font-bold content-center h-full"> PLG MuDiCS </span>
		<Button className="aspect-square" bg="bg-stone-800">
			<Settings></Settings>
		</Button>
	</div>
	<div class="w-[calc(100dvw-(8*var(--spacing)))] grid grid-cols-2 gap-2">
		<div class="h-[calc(100dvh-3rem-(12*var(--spacing)))] overflow-hidden flex flex-col gap-2">
			{#if $pinned_display_id}
				<!-- Pinned Item -->
				<div in:fade={{ duration: 140 }} out:fade={{ duration: 120 }}>
					<div
						class="grid grid-rows-[2.5rem_auto] overflow-hidden will-change-[height,opacity] rounded-2xl"
						transition:slide={{ duration: 260, easing: cubicOut }}
					>
						<div class="bg-stone-700 flex justify-between w-full p-1 min-w-0 basis-0 flex-1">
							<span
								class="text-xl font-bold pl-2 content-center truncate min-w-0"
								title={get_display_by_id($pinned_display_id)?.name}
							>
								{get_display_by_id($pinned_display_id)?.name}
							</span>
							<div class="flex flex-row gap-1">
								<OnlineState
									selected={false}
									status={get_display_by_id($pinned_display_id)?.status ?? ''}
									className="flex items-center px-2"
								/>
								<Button
									className="aspect-square !p-1"
									bg="bg-stone-600"
									click_function={() => {
										change_display_screen_height(1);
									}}
								>
									<Menu />
								</Button>

								<Button
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

						<div
							class="w-full max-h-[30dvh] aspect-16/9 bg-stone-800 flex justify-center items-center"
						>
							<div class="aspect-16/9 h-full bg-black flex justify-center items-center">
								<VideoOff class="size-[20%]" />
							</div>
						</div>
					</div>
				</div>
			{/if}

			<div
				class="min-h-0 h-full grid grid-rows-[2.5rem_auto] bg-stone-800 rounded-2xl overflow-hidden"
			>
				<!-- Normal Heading Left -->
				<div class="bg-stone-700 flex justify-between w-full p-1">
					<span class="text-xl font-bold pl-2 content-center"> Bereits verbundene Displays </span>
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
								className="aspect-square !p-1 rounded-r-none"
								bg="bg-stone-600"
								disabled={next_step_possible($display_screen_height, 1)}
								click_function={() => {
									change_display_screen_height(1);
								}}
							>
								<Plus />
							</Button>
							<Button
								className="aspect-square !p-1 rounded-l-none"
								bg="bg-stone-600"
								disabled={next_step_possible($display_screen_height, -1)}
								click_function={() => {
									change_display_screen_height(-1);
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
					</div>
				</div>
			</div>
		</div>
		<div class="col-start-2 h-[calc(100dvh-3rem-(12*var(--spacing)))] bg-stone-800 rounded-2xl">
			ok
		</div>
	</div>
</main>
