<script lang="ts">
	import { Plus, Settings } from 'lucide-svelte';
	import Button from '../components/Button.svelte';
	import FileView from '../components/FileView.svelte';
	import ControlView from '../components/ControlView.svelte';
	import DisplayView from '../components/DisplayView.svelte';
	import SplashScreen from './../../../../shared/splash_screen.html?raw';
	import PopUp from '../components/PopUp.svelte';
</script>

<main class="bg-stone-900 h-dvh w-dvw text-stone-200 px-4 py-2 gap-2 grid grid-rows-[3rem_auto]">
	<!-- {@html SplashScreen} -->

	<div class="w-[calc(100dvw-(8*var(--spacing)))] flex justify-between">
		<span class="text-4xl font-bold content-center pl-1"> PLG MuDiCS </span>
		<Button className="aspect-square" bg="bg-stone-800" div_class="aspect-square" menu_options={[{
			icon: Plus,
			name: "Bildschirm hinzufügen",
		},
		{
			icon: Settings,
			name: "Weitere Einstellungen",
		}]}>
			<Settings></Settings>
		</Button>
	</div>
	<div class="w-[calc(100dvw-(8*var(--spacing)))] grid grid-cols-2 gap-2">
		<DisplayView />
		<div
			class="col-start-2 h-[calc(100dvh-3rem-(6*var(--spacing)))] rounded-2xl flex flex-col gap-2"
		>
			<ControlView />
			<FileView />
		</div>
	</div>
	<!-- <PopUp title="Einstellungen" title_icon={Settings}>
		<div>ok</div>
	</PopUp> -->
</main>
