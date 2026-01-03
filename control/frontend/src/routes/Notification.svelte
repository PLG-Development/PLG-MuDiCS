<script lang="ts">
	import { fade } from 'svelte/transition';
	import Button from '$lib/components/Button.svelte';
	import { X } from 'lucide-svelte';
	import { notifications } from '$lib/ts/stores/notification';
</script>

<div
	data-testid="notification"
	class="fixed flex flex-col gap-2 top-[41%] right-2 left-2 md:top-auto md:left-auto md:bottom-2 md:w-100 z-50"
>
	{#each $notifications as n (n.id)}
		<div
			transition:fade={{ duration: 200 }}
			class="p-2 pl-4 pb-3 rounded-lg shadow-xl/30 text-white flex flex-col gap-2 overflow-hidden relative border border-black/20 {n.className}"
			class:bg-red-900={n.type === 'error'}
			class:bg-green-900={n.type === 'success'}
			class:bg-sky-900={n.type === 'info'}
			style="--dur: {n.duration}ms"
		>
			<div class="flex flex-row justify-between">
				<span class="text-xl font-bold flex items-center">{n.title}</span>
				<Button
					click_function={() => notifications.remove(n.id)}
					className="p-2"
					bg="bg-stone-900/50"
					hover_bg="bg-stone-600/70"
					active_bg="bg-stone-500/80"><X /></Button
				>
			</div>

			<span class="whitespace-break-spaces max-h-[60vh] overflow-auto">{n.message}</span>

			<div class="absolute inset-x-0 bottom-0 h-1 bg-white/25">
				<div class="block h-full w-full bg-white/80 origin-left animate-progress-bar"></div>
			</div>
		</div>
	{/each}
</div>

<style>
	@keyframes progress {
		from {
			transform: scaleX(0);
		}
		to {
			transform: scaleX(1);
		}
	}
	.animate-progress-bar {
		animation: progress var(--dur) linear forwards;
		transform-origin: left;
	}
</style>
