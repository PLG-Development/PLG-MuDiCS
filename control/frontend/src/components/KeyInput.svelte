<script lang="ts">
	import { flip } from 'svelte/animate';
	import { get_selectable_color_classes } from '../ts/stores/ui_behavior';
	import key_map_json from './../../../../shared/keys.json';
	import { fade } from 'svelte/transition';
	import { run_on_all_selected_displays } from '../ts/stores/displays';
	import { send_keyboard_input } from '../ts/api_handler';

	const key_map: Record<string, string> = key_map_json as Record<string, string>;

	let active = $state(false);
	let last_keys: { id: number; key: string }[] = $state([]);

	let el: HTMLDivElement;

	function add_to_last_keys(name: string) {
		const id = Date.now();
		last_keys.push({ id, key: name });
		setTimeout(() => {
			last_keys = last_keys.filter((e) => e.id !== id);
		}, 1500);
	}

	async function on_key_down(e: KeyboardEvent) {
		if (!active) return;
		const id = key_map[e.code];
		if (!id) return;
		e.preventDefault();
		e.stopPropagation();

		add_to_last_keys(e.code);
		if (e.repeat) return;

		await run_on_all_selected_displays(send_keyboard_input, true, id);
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
	onblur={() => (active = false)}
	onkeydown={on_key_down}
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
