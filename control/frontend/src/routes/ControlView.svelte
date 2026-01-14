<script lang="ts">
	import {
		ArrowBigLeft,
		ArrowBigRight,
		ChevronDown,
		Keyboard,
		Power,
		PowerOff,
		Presentation,
		SquareTerminal,
		TextAlignStart,
		TrafficCone
	} from 'lucide-svelte';
	import Button from '$lib/components/Button.svelte';
	import PopUp from '$lib/components/PopUp.svelte';
	import type { PopupContent } from '$lib/ts/types';
	import KeyInput from './KeyInput.svelte';
	import { send_keyboard_input, show_blackscreen, shutdown, startup } from '$lib/ts/api_handler';
	import { get_display_by_id, run_on_all_selected_displays } from '$lib/ts/stores/displays';
	import { selected_display_ids } from '$lib/ts/stores/select';
	import TipTapInput from './TipTapInput.svelte';
	import { db } from '$lib/ts/database';
	import { liveQuery, type Observable } from 'dexie';

	let all_display_states: Observable<'on' | 'off' | 'mixed'> | undefined = $state();
	$effect(() => {
		const ids = $selected_display_ids;
		all_display_states = liveQuery(() => all_state(ids));
	});

	let popup_content: PopupContent = $state({
		open: false,
		snippet: null,
		title: '',
		closable: true
	});

	function popup_close_function() {
		popup_content.open = false;
	}

	const show_send_keys_popup = () => {
		popup_content = {
			open: true,
			snippet: send_keys_popup,
			title: 'Tastatur-Eingaben durchgeben',
			title_icon: Keyboard,
			closable: true
		};
	};

	const show_text_popup = () => {
		popup_content = {
			open: true,
			snippet: text_popup,
			title: 'Text anzeigen',
			title_icon: TextAlignStart,
			closable: true,
			window_class: 'size-full'
		};
	};

	async function all_state(selected_display_ids: string[]): Promise<'on' | 'off' | 'mixed'> {
		const selected_displays = await Promise.all(
			selected_display_ids.map(async (id) => await get_display_by_id(id))
		);
		const selected_display_states = selected_displays.map((display) => display?.status ?? '');
		if (selected_display_states.every((state) => state === 'app_online')) {
			return 'on';
		} else if (selected_display_states.every((state) => state !== 'app_online')) {
			return 'off';
		} else {
			return 'mixed';
		}
	}

	async function ask_shutdonw() {
		popup_content = {
			open: true,
			snippet: ask_shutdonw_popup,
			title: 'PC Herunterfahren',
			title_icon: PowerOff,
			closable: true
		};
	}

	async function shutdown_action() {
		popup_content.open = false;
		await run_on_all_selected_displays((d) => {
			shutdown(d.ip); // no await here because we want to be fast
			db.displays.update(d.id, { status: 'app_offline' });
		}, false);
	}

	async function startup_action() {
		await run_on_all_selected_displays(
			async (d) => {
				if (!d.mac) return;
				startup(d.mac); // no await here because we want to be fast
				db.displays.update(d.id, { status: 'app_offline' });
			},
			false,
			false
		);
	}

	async function send_single_key_press(key: string) {
		await run_on_all_selected_displays((d) =>
			send_keyboard_input(d.ip, [{ key, action: 'press' }])
		);
		setTimeout(
			async () =>
				await run_on_all_selected_displays((d) =>
					send_keyboard_input(d.ip, [{ key, action: 'release' }])
				),
			10
		);
	}
</script>

{#snippet ask_shutdonw_popup()}
	<p>Bist du sicher, dass du alle ausgewählten Displays herunterfahren möchtest?</p>

	<div class="flex flex-row justify-end gap-2">
		<Button className="button space font-bold" click_function={() => (popup_content.open = false)}>
			Abbrechen
		</Button>
		<Button click_function={shutdown_action} className="button error space">Herunterfahren</Button>
	</div>
{/snippet}

{#snippet send_keys_popup()}
	<div class="overflow-hidden flex flex-col gap-2">
		<div>
			<KeyInput />
		</div>
		<div class="flex flex-row justify-end gap-2">
			<Button className="px-4 font-bold" click_function={popup_close_function}>Fertig</Button>
		</div>
	</div>
{/snippet}

{#snippet text_popup()}
	<TipTapInput />
{/snippet}

<div class="grid grid-rows-[2.5rem_auto] bg-stone-800 rounded-2xl min-w-0">
	<div class="text-xl font-bold pl-3 content-center bg-stone-700 rounded-t-2xl truncate min-w-0">
		Bildschirme steuern
	</div>
	<div class="relative flex flex-col gap-2 p-2 overflow-auto">
		<div class="flex flex-row justify-between gap-2">
			<div class="flex flex-col gap-2">
				<div class="flex flex-row gap-2 w-75 justify-normal">
					<Button
						title="Vorherige Folie (Pfeil nach Links)"
						className="px-9"
						disabled={$selected_display_ids.length === 0}
						click_function={async () => {
							await send_single_key_press('VK_LEFT');
						}}><ArrowBigLeft /></Button
					>
					<Button
						title="Nächste Folie (Pfeil nach Rechts)"
						className="px-9"
						disabled={$selected_display_ids.length === 0}
						click_function={async () => {
							await send_single_key_press('VK_RIGHT');
						}}><ArrowBigRight /></Button
					>
				</div>

				<Button
					className="px-3 flex gap-3 w-75 justify-normal"
					disabled={$selected_display_ids.length === 0}
					click_function={show_text_popup}><TextAlignStart /> Text anzeigen</Button
				>

				<Button
					className="px-3 flex gap-3 w-75 justify-normal"
					disabled={$selected_display_ids.length === 0}
					click_function={async () => {
						await run_on_all_selected_displays((d) => show_blackscreen(d.ip));
					}}><Presentation />Blackout</Button
				>

				<div class="flex flex-row justify-normal">
					<Button className="rounded-r-none pl-3 flex gap-3 grow w-65 justify-normal" disabled>
						<TrafficCone /> Fallback-Bild anzeigen
					</Button>
					<Button className="rounded-l-none flex grow-0 w-10" disabled><ChevronDown /></Button>
				</div>

				<Button
					className="px-3 flex gap-3 w-75 justify-normal"
					disabled={$selected_display_ids.length === 0}
					click_function={show_send_keys_popup}><Keyboard /> Tastatur-Eingaben durchgeben</Button
				>
			</div>
			<div class="flex flex-col gap-2 justify-between">
				<div class="flex flex-col gap-2">
					<Button
						className="px-3 flex gap-3 w-full xl:w-75 justify-normal"
						disabled={$all_display_states === 'on' || $selected_display_ids.length === 0}
						click_function={startup_action}
					>
						<Power /> PC hochfahren
					</Button>

					<Button
						className="px-3 flex gap-3 w-full xl:w-75 justify-normal"
						disabled={$all_display_states === 'off' || $selected_display_ids.length === 0}
						click_function={ask_shutdonw}
					>
						<PowerOff /> PC herunterfahren</Button
					>
				</div>
				<Button className="px-3 flex gap-3 w-full xl:w-75 justify-normal" disabled>
					<SquareTerminal />
					Shell-Befehl ausführen
				</Button>
			</div>
		</div>
		<PopUp
			content={popup_content}
			close_function={popup_close_function}
			className="rounded-b-2xl"
			snippet_container_class="size-full"
		/>
	</div>
</div>
