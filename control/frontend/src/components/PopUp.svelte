<script lang="ts">
	import { X } from 'lucide-svelte';
	import { onDestroy, onMount } from 'svelte';
	import Button from './Button.svelte';
	import type { PopupContent } from '../ts/types';
	import { fade } from 'svelte/transition';

	let { content, close_function } = $props<{
		content: PopupContent;
		close_function: () => void;
	}>();

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
		class="absolute inset-0 backdrop-blur bg-white/10 flex justify-center items-center"
		onclick={try_to_close}
		transition:fade={{ duration: 100 }}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="bg-stone-800 rounded-2xl min-w-[30%] min-h-[30%] max-w-[80%] max-h-[80%] flex flex-col shadow-2xl/60 overflow-hidden"
			onclick={(e) => e.stopPropagation()}
		>
			<div
				class="text-2xl font-bold bg-stone-700 p-1.5 flex flex-row justify-between gap-6 w-full"
			>
				<div class="flex flex-row flex-1 gap-4 pl-2 py-1 items-center grow whitespace-nowrap min-w-0 flex-shrink-0 {content.title_class ?? ''}">
					{#if content.title_icon}
						{@const Icon = content.title_icon}
						<Icon strokeWidth="2.8" class="flex-shrink-0" />
					{/if}
					<div class="flex-shrink-0">
						{content.title}
					</div>
				</div>
				<div class="flex aspect-square flex-shrink-0">
					{#if content.closable}
						<Button className="aspect-square !p-1.5" click_function={try_to_close}>
							<X />
						</Button>
					{/if}
				</div>
			</div>
			<div class="p-2 min-h-0 overflow-auto flex flex-col gap-2">
				{@render content.snippet()}
			</div>
		</div>
	</div>
{/if}
