<script lang="ts">
	import { X } from 'lucide-svelte';
	import Button from './Button.svelte';
	import type { PopupContent } from '$lib/ts/types';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';

	let {
		content,
		close_function,
		className = '',
		snippet_container_class = ''
	}: {
		content: PopupContent;
		close_function: () => void;
		className?: string;
		snippet_container_class?: string;
	} = $props();

	function try_to_close() {
		if (!content.closable || !content.open) return;
		close_function();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			try_to_close();
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

{#if content.open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="absolute inset-0 backdrop-blur flex justify-center items-center z-50 {className}"
		onclick={try_to_close}
		transition:fade={{ duration: 100 }}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="bg-stone-800 rounded-2xl min-w-[30%] max-w-[90%] max-h-[85%] flex flex-col shadow-2xl/60 overflow-hidden {content.window_class ??
				''}"
			onclick={(e) => e.stopPropagation()}
		>
			{#if content.title}
				<div class="font-bold bg-stone-700 p-1.5 flex flex-row justify-between gap-8 w-full">
					<div
						class="flex flex-row flex-1 gap-3 pl-2 py-1 items-center grow whitespace-nowrap min-w-0 shrink-0 text-lg {content.title_class ??
							''}"
					>
						{#if content.title_icon}
							{@const Icon = content.title_icon}
							<Icon strokeWidth="2" class="shrink-0" />
						{/if}
						<div class="shrink-0">
							{content.title}
						</div>
					</div>
					<div class="flex aspect-square shrink-0">
						{#if content.closable}
							<Button className="aspect-square p-1.5!" click_function={try_to_close}>
								<X />
							</Button>
						{/if}
					</div>
				</div>
			{/if}
			<div class="p-2 min-h-0 overflow-auto flex flex-col gap-2 {snippet_container_class}">
				{@render content.snippet(content.snippet_arg)}
			</div>
		</div>
	</div>
{/if}
