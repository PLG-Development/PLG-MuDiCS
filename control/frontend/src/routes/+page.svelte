<script lang="ts">
	import { Monitor, Plus, Radio, Settings, X } from 'lucide-svelte';
	import Button from '../components/Button.svelte';
	import FileView from '../components/FileView.svelte';
	import ControlView from '../components/ControlView.svelte';
	import DisplayView from '../components/DisplayView.svelte';
	import SplashScreen from './../../../../shared/splash_screen.html?raw';
	import PopUp from '../components/PopUp.svelte';
	import type { PopupContent } from '../ts/types';
	import TextInput from '../components/TextInput.svelte';
	import { add_display, is_display_name_taken } from '../ts/stores/displays';
	import { text } from '@sveltejs/kit';

	const ip_regex =
		/^(?:(?:10|127)\.(?:25[0-5]|2[0-4]\d|1?\d?\d)\.(?:25[0-5]|2[0-4]\d|1?\d?\d)\.(?:25[0-5]|2[0-4]\d|1?\d?\d)|192\.168\.(?:25[0-5]|2[0-4]\d|1?\d?\d)\.(?:25[0-5]|2[0-4]\d|1?\d?\d)|172\.(?:1[6-9]|2\d|3[0-1])\.(?:25[0-5]|2[0-4]\d|1?\d?\d)\.(?:25[0-5]|2[0-4]\d|1?\d?\d))$/;
	const mac_regex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

	let popup_content: PopupContent = $state({
		open: false,
		snippet: null,
		title: '',
		closable: true
	});

	let text_inputs_valid = $state({
		name: { valid: false, value: '' },
		ip: { valid: false, value: '' },
		mac: { valid: false, value: '' }
	});

	function all_text_inputs_valid(): boolean {
		for (const entry of Object.values(text_inputs_valid)) {
			if (!entry.valid) {
				return false;
			}
		}
		return true;
	}

	function finalize_add_new_display() {
		const ip = text_inputs_valid.ip.value;
		const mac = text_inputs_valid.mac.value === '' ? null : text_inputs_valid.mac.value;
		const name = text_inputs_valid.name.value;
		add_display(ip, mac, name, 'Online');
		popup_close_function();
		text_inputs_valid = {
			name: { valid: false, value: '' },
			ip: { valid: false, value: '' },
			mac: { valid: false, value: '' }
		};
	}

	function popup_close_function() {
		popup_content.open = false;
	}

	const show_new_display_popup = () => {
		popup_content = {
			open: true,
			snippet: add_new_display,
			title: 'Neuen Bildschirm hinzufügen',
			title_icon: Monitor,
			closable: true
		};
	};
</script>

{#snippet add_new_display()}
	<TextInput
		bind:current_value={text_inputs_valid.name.value}
		bind:current_valid={text_inputs_valid.name.valid}
		title="Anzeigename"
		placeholder="z.B. Beamer vorne links"
		is_valid_function={(input: string) => {
			return input.length === 0 || input.length > 50
				? [false, 'Ungültige Länge']
				: is_display_name_taken(input)
					? [false, 'Name bereits verwendet']
					: [true, 'Gültiger Name'];
		}}
	/>
	<div class="flex flex-row gap-2">
		<TextInput
			bind:current_value={text_inputs_valid.ip.value}
			bind:current_valid={text_inputs_valid.ip.valid}
			title="IP-Adresse"
			placeholder="z.B. 192.168.176.111"
			is_valid_function={(input: string) => {
				return ip_regex.test(input)
					? [true, 'Gültige IP-Adresse']
					: [false, 'Ungültige IP-Adresse'];
			}}
			className="grow"
		/>
		<div class="flex items-end shrink-0">
			<Button disabled={!text_inputs_valid.ip.valid} className="px-4 gap-2" bg="bg-stone-750"
				><Radio /> Ping</Button
			>
		</div>
	</div>
	<TextInput
		bind:current_value={text_inputs_valid.mac.value}
		bind:current_valid={text_inputs_valid.mac.valid}
		title="MAC-Adresse (optional)"
		placeholder="z.B. D4:81:A6:C4:BF:3F"
		is_valid_function={(input: string) => {
			return input === ''
				? [true, 'Keine MAC-Adresse (WOL deaktiviert)']
				: mac_regex.test(input)
					? [true, 'Gültige MAC-Adresse']
					: [false, 'Ungültige MAC-Adresse'];
		}}
	/>
	<div class="flex justify-end pt-2">
		<Button
			disabled={!all_text_inputs_valid()}
			className="pl-3 pr-4 gap-2 font-bold"
			bg="bg-stone-650"
			click_function={finalize_add_new_display}><Plus /> Bildschirm hinzufügen</Button
		>
	</div>
{/snippet}

<main class="bg-stone-900 h-dvh w-dvw text-stone-200 px-4 py-2 gap-2 grid grid-rows-[3rem_auto]">
	<!-- {@html SplashScreen} -->

	<div class="w-[calc(100dvw-(8*var(--spacing)))] flex justify-between">
		<span class="text-4xl font-bold content-center pl-1"> PLG MuDiCS </span>
		<Button
			className="aspect-square"
			bg="bg-stone-800"
			div_class="aspect-square"
			menu_options={[
				{
					icon: Plus,
					name: 'Neuen Bildschirm hinzufügen',
					on_select: show_new_display_popup
				},
				{
					icon: Settings,
					name: 'Weitere Einstellungen'
				}
			]}
		>
			<Settings></Settings>
		</Button>
	</div>
	<div class="w-[calc(100dvw-(8*var(--spacing)))] grid grid-cols-2 gap-2">
		<DisplayView />
		<div
			class="col-start-2 h-[calc(100dvh-3rem-(6*var(--spacing)))] rounded-2xl flex flex-col gap-2"
		>
			<ControlView />
			<FileView />
		</div>
	</div>
	<PopUp content={popup_content} close_function={popup_close_function} />
</main>
