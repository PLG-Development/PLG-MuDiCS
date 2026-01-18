<script lang="ts">
	import { flip } from 'svelte/animate';
	import { get_selectable_color_classes } from '$lib/ts/stores/ui_behavior';
	import { fade } from 'svelte/transition';
	import { run_on_all_selected_displays } from '$lib/ts/stores/displays';
	import { send_keyboard_input } from '$lib/ts/api_handler';

	let active = $state(false);
	const current_keys: string[] = $state([]);
	let last_keys: { id: number; key: string }[] = $state([]);

	let el: HTMLDivElement;

	function add_to_last_keys(name: string) {
		const id = Date.now();
		last_keys.push({ id, key: name });
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

		add_to_last_keys(action.toUpperCase() + ' ' + e.code);

		await run_on_all_selected_displays(
			(d) => send_keyboard_input(d.ip, [{ key: id, action }]),
			true
		);
	}

	async function release_all_pressed_keys() {
		const inputs: {key: string; action: 'press' | 'release' }[] = [];
		for (let i = current_keys.length - 1; i >= 0; i--) {
			inputs.push({key: current_keys[i], action: 'release'})
			current_keys.splice(i, 1);
		}

		await run_on_all_selected_displays(
			(d) => send_keyboard_input(d.ip, inputs),
			true
		);
	}
</script>

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
	class="relative flex justify-center items-center h-15 w-full cursor-pointer rounded-xl transition-colors duration-200 select-none {get_selectable_color_classes(
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
	<div class="absolute top-full left-0 ml-1 mt-0.5 flex flex-col-reverse text-sm text-stone-400">
		{#each last_keys as key (key.id)}
			<span
				animate:flip={{ duration: 200 }}
				in:fade={{ duration: 200 }}
				out:fade={{ duration: 500 }}>{key.key}</span
			>
		{/each}
	</div>
</div>
