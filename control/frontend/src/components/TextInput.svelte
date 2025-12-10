<script lang="ts">
	import { fade } from 'svelte/transition';
	import { get_shifted_color } from '../ts/stores/ui_behavior';
	import { onMount } from 'svelte';
	import { selected_display_ids } from '../ts/stores/select';

	let {
		current_value = $bindable(),
		current_valid = $bindable(),
		className = '',
		bg = 'bg-stone-750',
		title,
		placeholder = '',
		is_valid_function = null,
		focused_on_start = false,
		extension = null,
		enter_mode = 'none',
		enter_function = null
	} = $props<{
		current_value: string;
		current_valid: boolean;
		className?: string;
		bg?: string;
		title: string;
		placeholder?: string;
		is_valid_function?: ((input: string) => [boolean, string] | Promise<[boolean, string]>) | null;
		focused_on_start?: boolean;
		extension?: string | null;
		enter_mode?: 'none' | 'focus_next' | 'submit';
		enter_function?: (() => void) | null;
	}>();

	let focus_bg = get_shifted_color(bg, 100);
	let focused: boolean = $state(false);
	let current_info = $state('');
	let input_element: HTMLInputElement;

	async function validate_input() {
		if (!is_valid_function) return;
		[current_valid, current_info] = await is_valid_function(current_value.trim());
	}

	function get_highlighting_string(): string {
		if (!is_valid_function) return '';
		if (current_valid) {
			return 'focus-within:inset-ring-2 focus-within:inset-ring-green-400';
		} else {
			return 'inset-ring-2 inset-ring-red-400';
		}
	}

	function focus_next_element() {
		const focusable = Array.from(document.querySelectorAll<HTMLElement>('input')).filter(
			(el) => !el.hasAttribute('disabled')
		);

		const index = focusable.indexOf(input_element);
		if (index !== -1 && index < focusable.length - 1) {
			focusable[index + 1].focus();
		}
	}

	function handle_keydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;

		if (enter_mode === 'focus_next') {
			event.preventDefault();
			focus_next_element();
		} else if (enter_mode === 'submit' && enter_function) {
			event.preventDefault();
			enter_function();
		}
	}

	onMount(async () => {
		await validate_input();
		if (focused_on_start && input_element) input_element.focus();

		selected_display_ids.subscribe(async () => {
			await validate_input();
		});
	});
</script>

<div class="flex flex-col {className} relative">
	<div class="flex flex-row justify-between text-sm px-1 gap-4">
		<div class="text-stone-400">
			{title}:
		</div>
		{#if is_valid_function && focused}
			<div
				class={current_valid ? 'text-green-400' : 'text-red-400'}
				transition:fade={{ duration: 100 }}
			>
				{current_info}
			</div>
		{/if}
	</div>
	<!-- <input
		bind:this={input_element}
		bind:value={current_value}
		bind:focused
		onkeydown={handle_keydown}
		type="text"
		oninput={validate_input}
		class="{bg} focus:{focus_bg} outline-none py-2 px-3 rounded-xl transition-all duration-100 {get_highlighting_string()}"
		{placeholder}
	/> -->

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		onclick={() => {
			input_element.focus();
		}}
		class="{bg} focus-within:{focus_bg} flex items-center rounded-xl {get_highlighting_string()} cursor-text"
	>
		<input
			bind:this={input_element}
			bind:value={current_value}
			bind:focused
			onkeydown={handle_keydown}
			oninput={validate_input}
			type="text"
			class=" outline-none py-2 px-3 transition-all duration-100 flex-grow group"
			{placeholder}
		/>
		{#if extension}
			<span class="pr-3 text-stone-400 select-none pointer-events-none">
				{extension}
			</span>
		{/if}
	</div>
</div>
