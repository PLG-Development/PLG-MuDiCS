<script lang="ts">
	import type { X } from 'lucide-svelte';
	import { onDestroy, onMount } from 'svelte';

	let {
		children,
		title,
		title_class = '',
		title_icon,
		closable = true,
		close_function = null
	} = $props<{
		children: any;
		title: string;
		title_class?: string;
		title_icon: typeof X;
		closable?: boolean;
		close_function?: () => void | null;
	}>();

	// onMount(() => {
	// 	const handler = (e: KeyboardEvent) => {
	// 		// if (e.key === 'Escape') dispatch('close');
	// 	};
	// 	window.addEventListener('keydown', handler);
	// 	onDestroy(() => window.removeEventListener('keydown', handler));
	// });
</script>

<div class="fixed size-full backdrop-blur bg-black/30 flex justify-center items-center">
	<div
		class="bg-stone-800 rounded-2xl min-w-[30dvw] min-h-[20dvh] max-w-[80dvw] max-h-[80dvh] flex flex-col overflow-hidden shadow-2xl/30"
	>
		<div
			class="text-2xl font-bold bg-stone-700 {title_class} px-4 py-2 flex flex-row justify-between"
		>
			<div>
				{title}
			</div>
			<div>
				{#if title_icon}
					{@const Icon = title_icon}
					<Icon class="size-full" />
				{/if}
			</div>
		</div>
		<div class="px-4 py-2 min-h-0 overflow-auto">
			{@render children()}
		</div>
	</div>
</div>
