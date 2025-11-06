<script>
	import { Minus, Settings, TvMinimalPlay } from 'lucide-svelte';

	import Button from '../../components/Button.svelte';
	import { pinned_display_id } from '../../ts/stores/ui_behavior';
	import { fade, slide } from 'svelte/transition';
</script>

<main class="bg-stone-900 h-dvh w-dvw text-stone-200 p-4 gap-4 grid grid-rows-[3rem_auto]">
	<div class="w-[calc(100dvw-(8*var(--spacing)))] flex justify-between">
		<span class="text-4xl font-bold content-center h-full"> PLG MuDiCS </span>
		<Button className="aspect-square" bg="bg-stone-800">
			<Settings></Settings>
		</Button>
	</div>
	<div class="w-[calc(100dvw-(8*var(--spacing)))] grid grid-cols-2 gap-2">
		<div class="h-[calc(100dvh-3rem-(12*var(--spacing)))] flex flex-col gap-2"></div>
		<div
			class="col-start-2 h-[calc(100dvh-3rem-(12*var(--spacing)))] rounded-2xl flex flex-col gap-2"
		>
			<div class="bg-stone-800 h-full rounded-2xl grid grid-rows-[2.5rem_auto]">
				<div class="bg-stone-700 flex justify-between w-full p-1 rounded-t-2xl min-w-0 gap-2">
					<span class="text-xl font-bold pl-2 content-center truncate min-w-0">
						Dateien anzeigen und verwalten
					</span>
					<div class="flex flex-ro"></div>
				</div>
				<div class="flex flex-col gap-2 p-2 max-w-full overflow-hidden min-w-0">
					<div class="flex flex-row justify-between gap-4 min-w-0">
						<div class="flex flex-row gap-2 min-w-0 flex-1">
							<Button className="px-3 flex items-center gap-3 min-w-0 flex-1 justify-start">
								<TvMinimalPlay />
								<!-- Text: nimmt Restbreite, darf schrumpfen & ellipsieren -->
								<span class="truncate min-w-0 flex-1">Sehr lange Beschriftung für den Button</span>
							</Button>
							<div class="relative min-w-0 flex">
								<button class="text-xl font-bold pl-2 content-center truncate min-w-0">
									Dateien anzeigen und verwalten
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</main>
