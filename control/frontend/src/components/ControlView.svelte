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
	import Button from './Button.svelte';
	import PopUp from './PopUp.svelte';
	import type { PopupContent } from '../ts/types';
	import KeyInput from './KeyInput.svelte';
	import { send_keyboard_input, show_blackscreen } from '../ts/api_handler';
	import { run_on_all_selected_displays } from '../ts/stores/displays';
	import { selected_display_ids } from '../ts/stores/select';
	import TipTapInput from './TipTapInput.svelte';

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
</script>

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
							await run_on_all_selected_displays(send_keyboard_input, true, 'VK_LEFT');
						}}><ArrowBigLeft /></Button
					>
					<Button
						title="Nächste Folie (Pfeil nach Rechts)"
						className="px-9"
						disabled={$selected_display_ids.length === 0}
						click_function={async () => {
							await run_on_all_selected_displays(send_keyboard_input, true, 'VK_RIGHT');
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
						await run_on_all_selected_displays(show_blackscreen, true);
					}}><Presentation />Blackout</Button
				>
				<div class="flex flex-row justify-normal">
					<Button
						className="rounded-r-none pl-3 flex gap-3 grow w-65 justify-normal"
						disabled={$selected_display_ids.length === 0}
						><TrafficCone /> Fallback-Bild anzeigen</Button
					>
					<Button className="rounded-l-none flex grow-0 w-10"><ChevronDown /></Button>
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
						disabled={$selected_display_ids.length === 0}><Power /> PC hochfahren</Button
					>
					<Button
						className="px-3 flex gap-3 w-full xl:w-75 justify-normal"
						disabled={$selected_display_ids.length === 0}><PowerOff /> PC herunterfahren</Button
					>
				</div>
				<Button
					className="px-3 flex gap-3 w-full xl:w-75 justify-normal"
					disabled={$selected_display_ids.length === 0}
					><SquareTerminal /> Shell-Befehl ausführen</Button
				>
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
