<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import {
		all_displays_of_group_selected,
		get_display_by_id,
		get_display_groups,
		select_all_of_group,
		set_new_display_group_order
	} from '$lib/ts/stores/displays';
	import {
		change_height,
		current_height,
		dnd_flip_duration_ms,
		get_selectable_color_classes,
		is_display_drag,
		is_group_drag,
		next_height_step_size,
		pinned_display_id
	} from '$lib/ts/stores/ui_behavior';
	import { type Display, type DisplayGroup, type MenuOption } from '$lib/ts/types';
	import Button from '$lib/components/Button.svelte';
	import OnlineState from '../lib/components/OnlineState.svelte';
	import { cubicOut } from 'svelte/easing';
	import { Menu, Pencil, PinOff, Settings, Trash2, VideoOff, ZoomIn, ZoomOut } from 'lucide-svelte';
	import { selected_display_ids } from '$lib/ts/stores/select';
	import { dragHandleZone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import DisplayGroupObject from '../lib/components/DisplayGroupObject.svelte';
	import { Pane, Splitpanes } from 'svelte-splitpanes';
	import HighlightedText from '$lib/components/HighlightedText.svelte';
	import { liveQuery, type Observable } from 'dexie';

	let {
		handle_display_deletion,
		handle_display_editing
	}: {
		handle_display_deletion: (display_id: string) => void;
		handle_display_editing: (display_id: string) => void;
	} = $props();

	let displays_scroll_box: HTMLElement;
	let pinned_display: Observable<Display | null> | undefined = $state();
	$effect(() => {
		const pdi = $pinned_display_id;
		pinned_display = liveQuery(() => get_display_by_id(pdi || ''));
	});
	let display_groups = liveQuery(() => get_display_groups());
	let all_groups_selected: Observable<boolean> | undefined = $state();
	$effect(() => {
		const d = $display_groups;
		const sdi = $selected_display_ids;
		all_groups_selected = liveQuery(() => all_selected(d || [], sdi));
	});

	let last_pinned_pane_size: number = 45;
	let pinned_pane_size: number = $state(last_pinned_pane_size);

	function close_pinned_display() {
		last_pinned_pane_size = pinned_pane_size;
		pinned_pane_size = 0;
	}

	function get_display_menu_options(display_id: string): MenuOption[] {
		return [
			{
				icon: Pencil,
				name: 'Bildschirm bearbeiten',
				on_select: () => {
					handle_display_editing(display_id);
				}
			},
			{
				icon: Trash2,
				name: 'Bildschirm löschen',
				class: 'text-red-400 hover:text-stone-200 hover:!bg-red-400 active:!bg-red-500',
				on_select: () => {
					handle_display_deletion(display_id);
				}
			}
		];
	}

	async function select_all(current_displays: DisplayGroup[]) {
		const new_value = !all_groups_selected;
		for (const display_group of current_displays) {
			await select_all_of_group(display_group.id, new_value);
		}
	}

	async function all_selected(
		current_displays: DisplayGroup[],
		current_selected_display_ids: string[]
	) {
		for (const display_group of current_displays) {
			if (!(await all_displays_of_group_selected(display_group.id, current_selected_display_ids))) {
				return false;
			}
		}
		return true;
	}

	function handle_splitpane_resize(e: any) {
		if (e.detail[0].size === 0) {
			$pinned_display_id = null;
			pinned_pane_size = last_pinned_pane_size;
		}
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
	<Splitpanes
		horizontal
		theme="mudics-stone-theme"
		on:resized={handle_splitpane_resize}
		dblClickSplitter={false}
	>
		{#if $pinned_display_id}
			<!-- Pinned Item -->
			<Pane maxSize={60} snapSize={20} bind:size={pinned_pane_size}>
				<div class="h-full" transition:fade>
					<div class="grid grid-rows-[2.5rem_auto] will-change-[height,opacity] h-full">
						<div
							class="bg-stone-700 rounded-t-2xl flex justify-between w-full p-1 min-w-0 basis-0 flex-1"
						>
							<span
								class="text-xl font-bold pl-2 content-center truncate min-w-0"
								title={$pinned_display?.name || '...'}
							>
								{$pinned_display?.name || '...'}
							</span>
							<div class="flex flex-row gap-1">
								<div class="flex flex-row items-center mr-1">
									<span class="text-stone-400"> Aktueller Status: </span>
									<OnlineState
										selected={false}
										status={$pinned_display?.status ?? null}
										className="flex items-center px-2"
									/>
								</div>
								<Button
									className="aspect-square p-1!"
									bg="bg-stone-600"
									click_function={(e) => {
										e.stopPropagation();
									}}
									menu_options={get_display_menu_options($pinned_display_id)}
								>
									<Menu />
								</Button>

								<Button
									title="Bildschirm nicht mehr anpinnen"
									className="aspect-square p-1!"
									bg="bg-stone-600"
									click_function={close_pinned_display}
								>
									<PinOff />
								</Button>
							</div>
						</div>

						<div
							class="h-full bg-stone-800 rounded-b-2xl overflow-hidden flex justify-center items-center"
						>
							{#if $pinned_display?.preview.url}
								<img
									src={$pinned_display.preview.url}
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
			</Pane>
		{/if}

		<Pane>
			<div
				class="min-h-0 h-full grid grid-rows-[2.5rem_auto] bg-stone-800 rounded-2xl overflow-hidden"
			>
				<!-- Normal Heading Left -->
				<div class="bg-stone-700 flex justify-between w-full p-1 gap-2 min-w-0">
					<span class="text-xl font-bold pl-2 content-center truncate min-w-0">
						Verbundene Bildschirme
					</span>
					<div class="flex flex-row gap-1">
						<button
							class="min-w-40 px-4 rounded-xl cursor-pointer duration-200 transition-colors {get_selectable_color_classes(
								$all_groups_selected || false,
								{
									bg: true,
									hover: true,
									active: true,
									text: true
								}
							)}"
							onclick={async () => await select_all($display_groups || [])}
						>
							<span>{$all_groups_selected || false ? 'Alle abwählen' : 'Alle auswählen'}</span>
						</button>
						<div class="flex flex-row">
							<Button
								title="Bildschirme größer darstellen"
								className="aspect-square p-1.5! pr-1! rounded-r-none"
								bg="bg-stone-600"
								disabled={!Boolean(next_height_step_size('display', $current_height, 1))}
								click_function={() => {
									change_height('display', 1);
								}}
							>
								<ZoomIn class="size-full" />
							</Button>
							<Button
								title="Bildschirme kleiner darstellen"
								className="aspect-square p-1.5! pl-1! rounded-l-none"
								bg="bg-stone-600"
								disabled={!Boolean(next_height_step_size('display', $current_height, -1))}
								click_function={() => {
									change_height('display', -1);
								}}
							>
								<ZoomOut class="size-full" />
							</Button>
						</div>
					</div>
				</div>
				<div class="min-h-0 overflow-y-auto" bind:this={displays_scroll_box}>
					<div
						class="min-h-full p-2 flex flex-col gap-4"
						use:dragHandleZone={{
							items: $display_groups || [],
							type: 'group',
							flipDurationMs: dnd_flip_duration_ms,
							dropFromOthersDisabled: true,
							dropTargetStyle: { outline: 'none' }
						}}
						onconsider={async (e: CustomEvent) => {
							$is_group_drag = true;
							await set_new_display_group_order(e.detail.items);
						}}
						onfinalize={async (e: CustomEvent) => {
							await set_new_display_group_order(e.detail.items);
							$is_group_drag = false;
						}}
					>
						{#if ($display_groups || []).length === 0}
							<div class="text-stone-500 px-10 py-6 leading-relaxed text-center">
								Es wurden noch keine Bildschirme hinzugefügt. Klicke oben rechts auf
								<HighlightedText fg="text-stone-450" className="p-1!"
									><Settings class="inline pb-1" /></HighlightedText
								>
								und
								<HighlightedText fg="text-stone-450">Neuen Bildschirm hinzufügen</HighlightedText>.
							</div>
						{:else}
							{#each $display_groups || [] as display_group (display_group.id)}
								<!-- Each Group -->
								<section
									out:scale={{ duration: dnd_flip_duration_ms, easing: cubicOut }}
									animate:flip={{ duration: dnd_flip_duration_ms, easing: cubicOut }}
									class="outline-none"
								>
									<DisplayGroupObject
										display_group_id={display_group.id}
										{get_display_menu_options}
										{close_pinned_display}
									/>
								</section>
							{/each}
						{/if}
					</div>
				</div>
			</div>
		</Pane>
	</Splitpanes>
</div>
