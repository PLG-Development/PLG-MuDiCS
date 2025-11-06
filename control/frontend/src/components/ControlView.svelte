<script lang="ts">
	import {
		ArrowBigLeft,
		ArrowBigRight,
		ChevronDown,
		Keyboard,
		Power,
		PowerOff,
		Presentation,
		SquareTerminal,
		TextAlignStart,
		TrafficCone
	} from 'lucide-svelte';
	import Button from './Button.svelte';
</script>

<div class="grid grid-rows-[2.5rem_auto] bg-stone-800 rounded-2xl min-w-0">
	<div class="text-xl font-bold pl-3 content-center bg-stone-700 rounded-t-2xl truncate min-w-0">
		Bildschirme steuern
	</div>
	<div class="flex flex-col gap-2 p-2 overflow-auto">
		<div class="flex flex-row justify-between gap-2">
			<div class="flex flex-col gap-2">
				<div class="flex flex-row gap-2 w-70 justify-normal">
					<Button title="Vorherige Folie (Pfeil nach Links)" className="px-7"
						><ArrowBigLeft /></Button
					>
					<Button title="Nächste Folie (Pfeil nach Rechts)" className="px-7"
						><ArrowBigRight /></Button
					>
				</div>
				<Button className="px-3 flex gap-3 w-70 justify-normal"
					><TextAlignStart /> Text anzeigen</Button
				>
				<Button className="px-3 flex gap-3 w-70 justify-normal"><Presentation />Blackout</Button>
				<div class="flex flex-row justify-normal">
					<Button className="rounded-r-none pl-3 flex gap-3 grow w-60 justify-normal"
						><TrafficCone /> Fallback-Bild anzeigen</Button
					>
					<Button className="rounded-l-none flex grow-0 w-10"><ChevronDown /></Button>
				</div>
				<Button className="px-3 flex gap-3 w-70 justify-normal"
					><Keyboard /> Tastatur-Inputs durchgeben</Button
				>
			</div>
			<div class="flex flex-col gap-2 justify-between">
				<div class="flex flex-col gap-2">
					<Button className="px-3 flex gap-3 w-full xl:w-70 justify-normal"
						><Power /> PC hochfahren</Button
					>
					<Button className="px-3 flex gap-3 w-full xl:w-70 justify-normal"
						><PowerOff /> PC herunterfahren</Button
					>
				</div>
				<Button className="px-3 flex gap-3 w-full xl:w-70 justify-normal"
					><SquareTerminal /> Shell-Befehl ausführen</Button
				>
			</div>
		</div>
	</div>
</div>
