<script lang="ts">
	import { fade } from 'svelte/transition';
	import { get_shifted_color } from '../ts/stores/ui_behavior';
	import { onMount } from 'svelte';

	let {
		current_value = $bindable(),
		current_valid = $bindable(),
		className = '',
		bg = 'bg-stone-750',
		title,
		placeholder = '',
		is_valid_function = null,
		focused_on_start = false
	} = $props<{
		current_value: string;
		current_valid: boolean;
		className?: string;
		bg?: string;
		title: string;
		placeholder?: string;
		is_valid_function?: ((input: string) => [boolean, string]) | null;
		focused_on_start?: boolean;
	}>();

	let focus_bg = get_shifted_color(bg, 100);
	let focused: boolean = $state(false);
	let current_info = $state('');
	let input_element: HTMLInputElement;

	function validate_input() {
		if (!is_valid_function) return;
		[current_valid, current_info] = is_valid_function(current_value.trim());
	}

	function get_highlighting_string(): string {
		if (!is_valid_function) return '';
		if (current_valid) {
			return 'focus:inset-ring-2 focus:inset-ring-green-400';
		} else {
			return 'inset-ring-2 inset-ring-red-400';
		}
	}
	onMount(() => {
		validate_input();
		if (focused_on_start && input_element) input_element.focus();
	});
</script>

<div class="flex flex-col {className}">
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
	<input
		bind:this={input_element}
		bind:value={current_value}
		bind:focused
		type="text"
		oninput={validate_input}
		class="{bg} focus:{focus_bg} outline-none py-2 px-3 rounded-xl transition-all duration-100 {get_highlighting_string()}"
		{placeholder}
	/>
</div>
