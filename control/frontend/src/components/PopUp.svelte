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

<div class="absolute inset-0 backdrop-blur bg-white/10 flex justify-center items-center">
	<div
		class="bg-stone-800 rounded-2xl min-w-[40%] min-h-[30%] max-w-[80%] max-h-[80%] flex flex-col overflow-hidden shadow-2xl/30"
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
