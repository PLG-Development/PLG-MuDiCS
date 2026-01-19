<script lang="ts">
	import { flip } from 'svelte/animate';
	import { get_selectable_color_classes } from '$lib/ts/stores/ui_behavior';
	import { fade } from 'svelte/transition';
	import { run_on_all_selected_displays } from '$lib/ts/stores/displays';
	import { send_keyboard_input } from '$lib/ts/api_handler';
	import { ArrowDownToLine, ArrowUpFromLine, Grid2x2, Grid2X2 } from 'lucide-svelte';
	import Button from '$lib/components/Button.svelte';

	let {
		popup_close_function
	}: {
		popup_close_function: () => void;
	} = $props();

	let active = $state(false);
	const current_keys: string[] = $state([]);

	let last_keys: { id: number; key: string }[] = $state([]);
	let seq = 0;

	let el: HTMLDivElement;

	function add_to_last_keys(name: string) {
		const id = ++seq;

		// Neueste oben
		last_keys = [{ id, key: name }, ...last_keys].slice(0, 6);

		setTimeout(() => {
			last_keys = last_keys.filter((e) => e.id !== id);
		}, 1500);
	}

	async function on_key(e: KeyboardEvent, key_down: boolean) {
		if (!active) return;
		const id = e.code;
		if (!id) return;

		if (key_down) {
			if (current_keys.includes(e.code)) return;
			current_keys.push(e.code);
		} else {
			const index = current_keys.indexOf(e.code);
			if (index === -1) return;
			current_keys.splice(index, 1);
		}

		if (e.repeat) return;

		e.preventDefault();
		e.stopPropagation();

		const action: 'press' | 'release' = key_down ? 'press' : 'release';

		await send_keyboard_input_to_all_selected_displays(id, action);
	}

	async function release_all_pressed_keys() {
		const inputs: { key: string; action: 'press' | 'release' }[] = [];
		for (let i = current_keys.length - 1; i >= 0; i--) {
			inputs.push({ key: current_keys[i], action: 'release' });
			current_keys.splice(i, 1);
		}

		await run_on_all_selected_displays((d) => send_keyboard_input(d.ip, inputs), true);
	}

	async function press_alt_tab(action: 'press' | 'release') {
		if (action === 'press') {
			add_to_last_keys(action.toUpperCase() + ' ' + 'AltLeft');
			add_to_last_keys(action.toUpperCase() + ' ' + 'Tab');
			await run_on_all_selected_displays(
				(d) =>
					send_keyboard_input(d.ip, [
						{ key: 'AltLeft', action: 'press' },
						{ key: 'Tab', action: 'press' }
					]),
				true
			);

			setTimeout(
				async () => await send_keyboard_input_to_all_selected_displays('Tab', 'release'),
				100
			);
		} else {
			setTimeout(
				async () => await send_keyboard_input_to_all_selected_displays('AltLeft', 'release'),
				150
			);
		}
	}

	async function send_keyboard_input_to_all_selected_displays(
		key: string,
		action: 'press' | 'release'
	) {
		add_to_last_keys(action.toUpperCase() + ' ' + key);
		await run_on_all_selected_displays((d) => send_keyboard_input(d.ip, [{ key, action }]), true);
	}
</script>

<div class="flex flex-row gap-2 overflow-hidden h-full">
	<div
		role="textbox"
		tabindex="0"
		bind:this={el}
		onclick={() => {
			if (active) {
				el.blur();
			} else {
				el.focus();
				active = true;
			}
		}}
		onblur={async () => {
			active = false;
			await release_all_pressed_keys();
		}}
		onkeydown={(e) => on_key(e, true)}
		onkeyup={(e) => on_key(e, false)}
		class="flex justify-center items-center text-center grow py-2 px-8 w-70 h-full cursor-pointer rounded-xl transition-colors duration-200 select-none {get_selectable_color_classes(
			active,
			{
				bg: true,
				hover: true,
				active: true,
				text: true
			}
		)}"
	>
		{active ? 'Erfassung aktiv' : 'Hier für Erfassung klicken'}
	</div>
	<div
		class="relative flex flex-col gap-1 text-sm w-40 p-2 bg-stone-750 rounded-xl overflow-hidden h-full"
	>
		{#each last_keys as item (item.id)}
			<span
				class="flex flex-row gap-2 {item.key.split(' ')[0] === 'PRESS'
					? 'text-sky-600'
					: 'text-lime-600'}"
				animate:flip={{ duration: 120 }}
				in:fade={{ duration: 120 }}
				out:fade={{ duration: 200 }}
			>
				{#if item.key.split(' ')[0] === 'PRESS'}
					<ArrowDownToLine />
				{:else}
					<ArrowUpFromLine />
				{/if}
				{item.key.split(' ').at(-1)}
			</span>
		{/each}
		<div
			class="absolute bottom-0 right-0 left-0 h-5 bg-linear-to-b from-transparent to-stone-750"
		></div>
	</div>
	<div class="flex flex-col gap-2">
		<button
			title="Alt + Tab zum wechseln der aktuellen Fenster [gedrückt halten möglich]"
			class="px-4 bg-stone-700 py-2 rounded-xl flex justify-center items-center transition-colors duration-200 hover:bg-stone-600 active:bg-stone-500 cursor-pointer"
			onmousedown={async (e) => {
				e.preventDefault();
				await press_alt_tab('press');
			}}
			onmouseup={async () => {
				await press_alt_tab('release');
			}}
		>
			Alt + Tab
		</button>
		<button
			title="Windows-/Meta-Taste [gedrückt halten möglich]"
			class="px-4 bg-stone-700 py-2 gap-2 rounded-xl flex justify-center items-center transition-colors duration-200 hover:bg-stone-600 active:bg-stone-500 cursor-pointer"
			onmousedown={async (e) => {
				e.preventDefault();
				await send_keyboard_input_to_all_selected_displays('MetaLeft', 'press');
			}}
			onmouseup={async () => {
				await send_keyboard_input_to_all_selected_displays('MetaLeft', 'release');
			}}
		>
			<Grid2x2 /> Meta
		</button>

		<Button
			div_class="mt-2 justify-end"
			className="px-4 font-bold"
			click_function={popup_close_function}>Fertig</Button
		>
	</div>
</div>
