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
		TrafficCone,
		Globe
	} from 'lucide-svelte';
	import Button from '$lib/components/Button.svelte';
	import PopUp from '$lib/components/PopUp.svelte';
	import type { PopupContent } from '$lib/ts/types';
	import KeyInput from './KeyInput.svelte';
	import {
		send_keyboard_input,
		show_blackscreen,
		shutdown,
		startup,
		show_html
	} from '$lib/ts/api_handler';
	import {
		get_display_by_id,
		no_active_display_selected,
		online_displays,
		run_on_all_selected_displays
	} from '$lib/ts/stores/displays';
	import { selected_display_ids } from '$lib/ts/stores/select';
	import TipTapInput from './TipTapInput.svelte';
	import { db } from '$lib/ts/database';
	import { liveQuery, type Observable } from 'dexie';
	import TextInput from '$lib/components/TextInput.svelte';
	import { add_to_keyboard_queue } from '$lib/ts/utils';

	let all_display_states: Observable<'on' | 'off' | 'mixed'> | undefined = $state();
	$effect(() => {
		const ids = $selected_display_ids;
		all_display_states = liveQuery(() => all_state(ids));
	});

	let popup_content: PopupContent = $state({
		open: false,
		snippet: null,
		title: '',
	});

	let current_text = $state('');

	function popup_close_function() {
		popup_content.open = false;
	}

	const show_send_keys_popup = () => {
		popup_content = {
			open: true,
			snippet: send_keys_popup,
			title: 'Tastatur-Eingaben Senden',
			title_icon: Keyboard,
			window_class: 'h-full'
		};
	};

	const show_text_popup = () => {
		popup_content = {
			open: true,
			snippet: text_popup,
			title: 'Text Anzeigen',
			title_icon: TextAlignStart,
			window_class: 'size-full'
		};
	};

	const show_website_popup = () => {
		popup_content = {
			open: true,
			snippet: website_popup,
			title: 'Webseite Anzeigen',
			window_class: 'w-xl',
			title_icon: Globe,
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

	async function ask_shutdown() {
		popup_content = {
			open: true,
			snippet: ask_shutdown_popup,
			title: 'Bildschirm Herunterfahren',
			title_icon: PowerOff,
		};
	}

	async function shutdown_action() {
		popup_content.open = false;
		await run_on_all_selected_displays((d) => {
			shutdown(d.ip); // no await here because we want to be fast
			db.displays.update(d.id, { status: 'app_offline', preview: { currently_updating: false, url: null} });
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

	async function send_single_key_press(key: string, action: 'press' | 'release') {
		await run_on_all_selected_displays((d) => send_keyboard_input(d.ip, [{ key, action }]));
	}
	let website_url = $state('');
	let website_url_valid = $state(false);

	function validate_website_url(url: string): [boolean, string] {
		if (url === '') return [true, ''];
		const regex = /^https?:\/\/[\w\-]+(\.[\w\-]+)+([\w\-\._~:/?#\[\]@!$&'\(\)\*\+,;=.])*/;
		if (regex.test(url)) {
			return [true, ''];
		}
		return [false, 'Ungültige URL'];
	}

	async function send_website() {
		popup_content.open = false;
		await run_on_all_selected_displays((d) =>
			show_html(d.ip, `<iframe src="${website_url}"></iframe>`)
		);
	}
</script>

{#snippet website_popup()}
	<div class="flex flex-col gap-2">
		<TextInput
			title="URL (mit http:// oder https://)"
			placeholder="https://example.com"
			bind:current_value={website_url}
			bind:current_valid={website_url_valid}
			is_valid_function={validate_website_url}
			enter_mode="submit"
			enter_function={send_website}
		/>
		<div class="flex flex-row justify-end gap-2">
			<Button className="button space font-bold" click_function={popup_close_function}>
				Abbrechen
			</Button>
			<Button
				click_function={send_website}
				disabled={!website_url_valid || website_url === ''}
				className="button success space">Anzeigen</Button
			>
		</div>
	</div>
{/snippet}

{#snippet ask_shutdown_popup()}
	<p>Bist du sicher, dass du alle ausgewählten Displays herunterfahren möchtest?</p>

	<div class="flex flex-row justify-end gap-2">
		<Button className="button space font-bold" click_function={() => (popup_content.open = false)}>
			Abbrechen
		</Button>
		<Button click_function={shutdown_action} className="button error space">Herunterfahren</Button>
	</div>
{/snippet}

{#snippet send_keys_popup()}
	<KeyInput {popup_close_function}/>
{/snippet}

{#snippet text_popup()}
	<TipTapInput bind:text={current_text}/>
{/snippet}

<div class="grid grid-rows-[2.5rem_auto] bg-stone-800 rounded-2xl min-w-0">
	<div class="text-xl font-bold pl-3 content-center bg-stone-700 rounded-t-2xl truncate min-w-0">
		Bildschirme Steuern
	</div>
	<div class="relative flex flex-col gap-2 p-2 overflow-auto">
		<div class="flex flex-row justify-between gap-2">
			<div class="flex flex-col gap-2">
				<div class="flex flex-row gap-2 w-75 justify-normal">
					<button
						title="Vorherige Folie (Pfeil nach Links) [gedrückt halten möglich]"
						class="px-9 bg-stone-700 {$selected_display_ids.length === 0
							? 'text-stone-500 cursor-not-allowed'
							: 'hover:bg-stone-600 active:bg-stone-500 cursor-pointer'} py-2 rounded-xl flex justify-center items-center transition-colors duration-200"
						disabled={$selected_display_ids.length === 0}
						onmousedown={() => {
							add_to_keyboard_queue(async () => await send_single_key_press('ArrowLeft', 'press'));
						}}
						onmouseup={() => {
							add_to_keyboard_queue(async () => await send_single_key_press('ArrowLeft', 'release'));
						}}
					>
						<ArrowBigLeft />
					</button>

					<button
						title="Vorherige Folie (Pfeil nach Links) [gedrückt halten möglich]"
						class="px-9 bg-stone-700 {$selected_display_ids.length === 0
							? 'text-stone-500 cursor-not-allowed'
							: 'hover:bg-stone-600 active:bg-stone-500 cursor-pointer'} py-2 rounded-xl flex justify-center items-center transition-colors duration-200"
						disabled={$selected_display_ids.length === 0}
						onmousedown={() => {
							add_to_keyboard_queue(async () => await send_single_key_press('ArrowRight', 'press'));
						}}
						onmouseup={() => {
							add_to_keyboard_queue(async () => await send_single_key_press('ArrowRight', 'release'));
						}}
					>
						<ArrowBigRight />
					</button>
				</div>

				<Button
					className="px-3 flex gap-3 w-75 justify-normal"
					click_function={show_text_popup}
					disabled={no_active_display_selected($selected_display_ids, $online_displays)}
					><TextAlignStart /> Text Anzeigen</Button
				>

				<Button
					className="px-3 flex gap-3 w-75 justify-normal"
					disabled={no_active_display_selected($selected_display_ids, $online_displays)}
					click_function={show_website_popup}><Globe /> Webseite Anzeigen</Button
				>

				<Button
					className="px-3 flex gap-3 w-75 justify-normal"
					disabled={no_active_display_selected($selected_display_ids, $online_displays)}
					click_function={async () => {
						await run_on_all_selected_displays((d) => show_blackscreen(d.ip));
					}}><Presentation />Blackout</Button
				>

				<div class="flex flex-row justify-normal">
					<Button className="rounded-r-none pl-3 flex gap-3 grow w-65 justify-normal" disabled>
						<TrafficCone /> Fallback-Bild Anzeigen
					</Button>
					<Button className="rounded-l-none flex grow-0 w-10" disabled><ChevronDown /></Button>
				</div>

				<Button
					className="px-3 flex gap-3 w-75 justify-normal"
					disabled={no_active_display_selected($selected_display_ids, $online_displays)}
					click_function={show_send_keys_popup}><Keyboard /> Tastatur-Eingaben Senden</Button
				>
			</div>
			<div class="flex flex-col gap-2 justify-between">
				<div class="flex flex-col gap-2">
					<Button
						className="px-3 flex gap-3 w-full xl:w-75 justify-normal"
						disabled={$all_display_states === 'on' ||
							no_active_display_selected($selected_display_ids, $online_displays)}
						click_function={startup_action}
					>
						<Power /> Bildschirm Hochfahren
					</Button>

					<Button
						className="px-3 flex gap-3 w-full xl:w-75 justify-normal"
						disabled={$all_display_states === 'off' ||
							no_active_display_selected($selected_display_ids, $online_displays)}
						click_function={ask_shutdown}
					>
						<PowerOff /> Bildschirm Herunterfahren</Button
					>
				</div>
				<Button className="px-3 flex gap-3 w-full xl:w-75 justify-normal" disabled>
					<SquareTerminal />
					Shell-Befehl Ausführen
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
