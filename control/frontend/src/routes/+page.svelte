<script lang="ts">
	import {
		ArrowBigLeft,
		ArrowBigRight,
		ArrowUp,
		ChevronDown,
		ClipboardPaste,
		Download,
		FolderOutput,
		Info,
		Keyboard,
		Menu,
		Minus,
		Pencil,
		PinOff,
		Plus,
		Power,
		PowerOff,
		Presentation,
		RefreshCcw,
		Scissors,
		Settings,
		Square,
		SquareTerminal,
		TextAlignStart,
		TrafficCone,
		Trash2,
		TvMinimalPlay,
		Upload,
		VideoOff,
		X
	} from 'lucide-svelte';
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
	import PopUp from '../components/PopUp.svelte';
	import FileObject from '../components/FileObject.svelte';

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
		<div class="h-[calc(100dvh-3rem-(12*var(--spacing)))] flex flex-col gap-2">
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
				<div class="bg-stone-700 flex justify-between w-full p-1 gap-2 min-w-0">
					<span class="text-xl font-bold pl-2 content-center truncate min-w-0">
						Bereits verbundene Displays
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
								disabled={next_step_possible($display_screen_height, 1)}
								click_function={() => {
									change_display_screen_height(1);
								}}
							>
								<Plus />
							</Button>
							<Button
								title="Bildschirme kleiner darstellen"
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
		<div
			class="col-start-2 h-[calc(100dvh-3rem-(12*var(--spacing)))] rounded-2xl flex flex-col gap-2"
		>
			<div class="grid grid-rows-[2.5rem_auto] bg-stone-800 rounded-2xl min-w-0">
				<div
					class="text-xl font-bold pl-3 content-center bg-stone-700 rounded-t-2xl truncate min-w-0"
				>
					{'Bildschirme steuern (' + $selected_display_ids.length + ' ausgewählt)'}
				</div>
				<div class="flex flex-col gap-2 p-2 overflow-auto">
					<div class="flex flex-row justify-between gap-2">
						<div class="flex flex-col gap-2">
							<div class="flex flex-row gap-2 w-70 justify-normal">
								<Button title="Vorherige Folie (Pfeil nach Links)" className="px-7"
									><ArrowBigLeft /></Button
								>
								<Button title="Nächste Folie (Pfeil nach Rechts)" className="px-7"
									><ArrowBigRight /></Button
								>
							</div>
							<Button className="px-3 flex gap-3 w-70 justify-normal"
								><TextAlignStart /> Text anzeigen</Button
							>
							<Button className="px-3 flex gap-3 w-70 justify-normal"
								><Presentation />Blackout</Button
							>
							<div class="flex flex-row justify-normal">
								<Button className="rounded-r-none pl-3 flex gap-3 grow w-60 justify-normal"
									><TrafficCone /> Fallback-Bild anzeigen</Button
								>
								<Button className="rounded-l-none flex grow-0 w-10"><ChevronDown /></Button>
							</div>
							<Button className="px-3 flex gap-3 w-70 justify-normal"
								><Keyboard /> Tastatur-Inputs durchgeben</Button
							>
						</div>
						<div class="flex flex-col gap-2 justify-between">
							<div class="flex flex-col gap-2">
								<Button className="px-3 flex gap-3 w-full xl:w-70 justify-normal"
									><Power /> PC hochfahren</Button
								>
								<Button className="px-3 flex gap-3 w-full xl:w-70 justify-normal"
									><PowerOff /> PC herunterfahren</Button
								>
							</div>
							<Button className="px-3 flex gap-3 w-full xl:w-70 justify-normal"
								><SquareTerminal /> Shell-Befehl ausführen</Button
							>
						</div>
					</div>
				</div>
			</div>
			<div class="bg-stone-800 h-full rounded-2xl grid grid-rows-[2.5rem_auto]">
				<div class="bg-stone-700 flex justify-between w-full p-1 rounded-t-2xl min-w-0 gap-2">
					<span class="text-xl font-bold pl-2 content-center truncate min-w-0">
						Dateien anzeigen und verwalten
					</span>
					<div class="flex flex-ro">
						<Button
							title="Dateien größer darstellen"
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
							title="Dateien kleiner darstellen"
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
				<div class="flex flex-col gap-2 p-2 overflow-auto">
					<div class="flex flex-row justify-between gap-6 overflow-x-auto">
						<div class="flex flex-row gap-2">
							<Button title="Eine Verzeichnis-Ebene zurück" className="px-3 flex"><FolderOutput /></Button>
							<Button title="Datei anzeigen" className="px-3 flex gap-3">
								<TvMinimalPlay class="shrink-0 flex"/>
								<span class="min-w-0 hidden xl:flex">Anzeigen</span>
							</Button>
							<Button
								title="Dateien zwischen Bildschirmen synchronisieren"
								className="px-3 flex gap-3"
								><RefreshCcw />
								<span class="hidden 2xl:flex">Synchronisieren</span>
							</Button>
						</div>
						<div class="flex flex-row gap-2">
							<Button title="Datei(en) hochladen" className="px-3 flex"><Upload /></Button>
							<Button title="Datei(en) herunterladen" className="px-3 flex"><Download /></Button>
							<div class="border border-stone-700 my-1"></div>
							<Button title="Datei(en) ausschneiden" className="px-3 flex"><Scissors /></Button>
							<Button title="Datei(en) einfügen" className="px-3 flex"><ClipboardPaste /></Button>
							<div class="border border-stone-700 my-1"></div>
							<Button title="Datei(en) löschen" className="hover:!bg-red-400 px-3 flex"><Trash2 /></Button>
						</div>
					</div>
					<div class="flex flex-col gap-2 p-2 bg-stone-750 h-full rounded-xl">
						<FileObject />
					</div>
				</div>

			</div>
		</div>
	</div>
	<!-- <PopUp title="Test" title_icon={Info}>
		<div>ok schade</div>
	</PopUp> -->
</main>
