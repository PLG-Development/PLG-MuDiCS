<script lang="ts">
	import { Monitor, Plus, Radio, Settings, Trash2, Menu } from 'lucide-svelte';
	import Button from '$lib/components/Button.svelte';
	import FileView from './FileView.svelte';
	import ControlView from './ControlView.svelte';
	import DisplayView from './DisplayView.svelte';
	import PopUp from '$lib/components/PopUp.svelte';
	import { type Display, type PopupContent } from '$lib/ts/types';
	import TextInput from '$lib/components/TextInput.svelte';
	import {
		add_display,
		edit_display_data,
		get_display_by_id,
		is_display_name_taken,
		remove_display
	} from '$lib/ts/stores/displays';
	import { notifications } from '$lib/ts/stores/notification';
	import { ping_ip } from '$lib/ts/api_handler';
	import { onMount } from 'svelte';
	import { on_app_start, update_display_status } from '$lib/ts/main';
	import { display_status_to_info } from '$lib/ts/utils';
	import HighlightedText from '$lib/components/HighlightedText.svelte';

	const ip_regex =
		/^(?:(?:10|127)\.(?:25[0-5]|2[0-4]\d|1?\d?\d)\.(?:25[0-5]|2[0-4]\d|1?\d?\d)\.(?:25[0-5]|2[0-4]\d|1?\d?\d)|192\.168\.(?:25[0-5]|2[0-4]\d|1?\d?\d)\.(?:25[0-5]|2[0-4]\d|1?\d?\d)|172\.(?:1[6-9]|2\d|3[0-1])\.(?:25[0-5]|2[0-4]\d|1?\d?\d)\.(?:25[0-5]|2[0-4]\d|1?\d?\d))$/;
	const mac_regex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

	let popup_content: PopupContent = $state({
		open: false,
		snippet: null,
		title: '',
		title_class: '!text-xl',
		closable: true
	});
	let remove_display_name = $state('');

	const text_inputs_valid_null_values = {
		name: { valid: false, value: '' },
		ip: { valid: false, value: '' },
		mac: { valid: false, value: '' }
	};
	let text_inputs_valid = $state(text_inputs_valid_null_values);

	function all_text_inputs_valid(): boolean {
		for (const entry of Object.values(text_inputs_valid)) {
			if (!entry.valid) {
				return false;
			}
		}
		return true;
	}

	async function finalize_add_edit_display(existing_display_id: string | null) {
		popup_close_function();
		const ip = text_inputs_valid.ip.value;
		const mac = text_inputs_valid.mac.value === '' ? null : text_inputs_valid.mac.value;
		const name = text_inputs_valid.name.value;
		let display: Display | null = null;
		if (!!existing_display_id) {
			display = await edit_display_data(existing_display_id, ip, mac, name);
		} else {
			const status = await ping_ip(text_inputs_valid.ip.value);
			display = await add_display(ip, mac, name, status);
		}
		if (!!display) {
			await update_display_status(display);
		}
	}

	function popup_close_function() {
		popup_content.open = false;
	}

	const show_new_display_popup = () => {
		text_inputs_valid = text_inputs_valid_null_values;
		popup_content = {
			open: true,
			snippet: display_popup,
			title: 'Neuen Bildschirm hinzufügen',
			title_icon: Monitor,
			title_class: '!text-xl',
			window_class: 'w-3xl',
			closable: true
		};
	};

	const show_remove_display_popup = async (display_id: string) => {
		remove_display_name = (await get_display_by_id(display_id))?.name || '?';
		popup_content = {
			open: true,
			snippet: remove_display_popup,
			snippet_arg: display_id,
			title: 'Bildschirm wirklich löschen?',
			title_class: 'text-red-400 !text-xl',
			title_icon: Trash2,
			closable: true
		};
	};

	const show_edit_display_popup = async (display_id: string) => {
		const display = await get_display_by_id(display_id);
		if (!display) return;
		// insert existing values in text_inputs_valid
		for (const key of Object.keys(text_inputs_valid) as (keyof typeof text_inputs_valid)[]) {
			text_inputs_valid[key].valid = true;
			text_inputs_valid[key].value = display[key] || '';
		}
		popup_content = {
			open: true,
			snippet: display_popup,
			snippet_arg: display_id,
			title: 'Bildschirm bearbeiten',
			title_icon: Monitor,
			title_class: '!text-xl',
			closable: true
		};
	};

	onMount(on_app_start);
</script>

{#snippet remove_display_popup(display_id: string)}
	<div class="max-w-prose px-2">
		Soll der Bildschirm <HighlightedText>{remove_display_name}</HighlightedText> wirklich gelöscht werden?
		Dadurch wird es von diesem Controller nicht mehr erreichbar. Die Installation auf dem Gerät bleibt
		bestehen. Mit dem erneuten Hinzufügen des Bildschirms wird er wieder steuerbar.
	</div>
	<div class="flex flex-row justify-end gap-2">
		<Button className="button space font-bold" click_function={popup_close_function}>
			Abbrechen
		</Button>
		<Button
			className="error button space"
			click_function={async () => {
				popup_close_function();
				await remove_display(display_id);
			}}>Löschen</Button
		>
	</div>
{/snippet}

{#snippet display_popup(existing_display_id: string | null = null)}
	<TextInput
		focused_on_start
		bind:current_value={text_inputs_valid.name.value}
		bind:current_valid={text_inputs_valid.name.valid}
		title="Anzeigename"
		placeholder="z.B. Beamer vorne links"
		is_valid_function={async (input: string) => {
			if (!!existing_display_id) {
				if (input === (await get_display_by_id(existing_display_id))?.name)
					return [true, 'Gültiger Name'];
			}
			if (input.length === 0 || input.length > 50) return [false, 'Ungültige Länge'];
			if (await is_display_name_taken(input)) return [false, 'Name bereits verwendet'];
			return [true, 'Gültiger Name'];
		}}
		enter_mode="focus_next"
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
			enter_mode="focus_next"
		/>
		<div class="flex items-end shrink-0">
			<Button
				disabled={!text_inputs_valid.ip.valid}
				className="px-4 gap-2"
				bg="bg-stone-750"
				click_function={async () => {
					const status = await ping_ip(text_inputs_valid.ip.value);
					notifications.push(
						'info',
						`Ping '${text_inputs_valid.ip.value}'`,
						`Aktueller Zustand: ${display_status_to_info(status)}`
					);
				}}><Radio /> Ping</Button
			>
		</div>
	</div>
	<TextInput
		bind:current_value={text_inputs_valid.mac.value}
		bind:current_valid={text_inputs_valid.mac.valid}
		title="MAC-Adresse (optional, wird zum aufwecken des Displays benötigt)"
		placeholder="z.B. D4:81:A6:C4:BF:3F"
		is_valid_function={(input: string) => {
			return input === ''
				? [true, 'Keine MAC-Adresse (WOL deaktiviert)']
				: mac_regex.test(input)
					? [true, 'Gültige MAC-Adresse']
					: [false, 'Ungültige MAC-Adresse'];
		}}
		enter_mode="submit"
		enter_function={async () => {
			await finalize_add_edit_display(existing_display_id);
		}}
	/>
	<div class="flex flex-row gap-2 justify-end pt-2">
		{#if !!existing_display_id}
			<!-- TODO: Ping mit existing_display_id -->
			<Button className="px-4" click_function={popup_close_function}>Abbrechen</Button>
		{/if}
		<Button
			disabled={!all_text_inputs_valid()}
			className="{!!existing_display_id ? 'px-4' : 'pl-3 pr-4 gap-2'} font-bold"
			bg="bg-stone-650"
			click_function={async () => {
				await finalize_add_edit_display(existing_display_id);
			}}
			>{#if !!existing_display_id}
				Speichern
			{:else}
				<Plus /> Bildschirm hinzufügen
			{/if}
		</Button>
	</div>
{/snippet}

<main class="bg-stone-900 h-dvh w-dvw text-stone-200 px-4 py-2 gap-2 grid grid-rows-[3rem_auto]">
	<div class="w-[calc(100dvw-(8*var(--spacing)))] flex justify-between">
		<span class="text-4xl font-bold content-center pl-1"> PLG MuDiCS </span>
		<Button
			className="aspect-square"
			div_class="aspect-square"
			menu_options={[
				{
					icon: Plus,
					name: 'Neuen Bildschirm hinzufügen',
					on_select: show_new_display_popup
				}
			]}
		>
			<Menu />
		</Button>
	</div>
	<div class="w-[calc(100dvw-(8*var(--spacing)))] grid grid-cols-2 gap-2">
		<DisplayView
			handle_display_deletion={show_remove_display_popup}
			handle_display_editing={show_edit_display_popup}
		/>
		<div
			class="col-start-2 h-[calc(100dvh-3rem-(6*var(--spacing)))] rounded-2xl flex flex-col gap-2"
		>
			<ControlView />
			<FileView />
		</div>
	</div>
	<PopUp
		content={popup_content}
		close_function={popup_close_function}
		className="bg-white/10"
		snippet_container_class="min-w-115"
	/>
</main>
