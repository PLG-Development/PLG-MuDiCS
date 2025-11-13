<script lang="ts">
	import {
		ClipboardPaste,
		Download,
		FolderPlus,
		Info,
		Minus,
		Pen,
		Plus,
		RefreshCcw,
		Scissors,
		Trash2,
		Upload
	} from 'lucide-svelte';
	import { change_height, current_height, next_height_step_size } from '../ts/stores/ui_behavior';
	import Button from './Button.svelte';
	import PathBar from './PathBar.svelte';
	import { selected_display_ids, selected_file_ids } from '../ts/stores/select';
	import { all_files, current_file_path, get_current_folder_elements } from '../ts/stores/files';
	import { slide } from 'svelte/transition';
	import FolderElementObject from './FolderElementObject.svelte';
	import PopUp from './PopUp.svelte';
	import type { PopupContent } from '../ts/types';
	import TextInput from './TextInput.svelte';
	import { is_valid_name } from '../ts/utils';

	let current_name: string = '';
	let current_valid: boolean = false;

	let popup_content: PopupContent = $state({
		open: false,
		snippet: null,
		title: '',
		closable: true
	});

	function popup_close_function() {
		popup_content.open = false;
	}

	const show_new_folder_popup = () => {
		popup_content = {
			open: true,
			snippet: new_folder_popup,
			title: 'Neuen Ordner erstellen',
			title_icon: FolderPlus,
			closable: true
		};
	};
</script>

{#snippet new_folder_popup()}
	<div>
		<TextInput
			current_value={current_name}
			{current_valid}
			title="Ordnername"
			is_valid_function={(input: string) => {
				if (input.startsWith('.')) return [false, 'Name darf nicht mit . beginnen'];
				const trimmed_input = input.trim();
				if (trimmed_input.length === 0 || trimmed_input.length > 50)
					return [false, 'Ungültige Länge'];
				if (!is_valid_name(trimmed_input)) return [false, 'Name enthält ungültige Zeichen'];
				if (
					get_current_folder_elements($all_files, $current_file_path, $selected_display_ids).some(
						(e) => e.name === trimmed_input
					)
				)
					return [false, 'Name bereits verwendet'];
				return [true, 'Gültiger Name'];
			}}
		/>
	</div>
	<div class="flex flex-row justify-end gap-2">
		<Button className="px-4 font-bold" click_function={popup_close_function}>Fertig</Button>
	</div>
{/snippet}

<div class="bg-stone-800 h-full rounded-2xl grid grid-rows-[2.5rem_1fr] min-h-0">
	<div class="bg-stone-700 flex justify-between w-full p-1 rounded-t-2xl min-w-0 gap-2">
		<span class="text-xl font-bold pl-2 content-center truncate min-w-0">
			Dateien anzeigen und verwalten
		</span>
		<div class="flex flex-ro">
			<Button
				title="Dateien größer darstellen"
				className="aspect-square !p-1 rounded-r-none"
				bg="bg-stone-600"
				disabled={!Boolean(next_height_step_size('file', $current_height, 1))}
				click_function={() => {
					change_height('file', 1);
				}}
			>
				<Plus />
			</Button>
			<Button
				title="Dateien kleiner darstellen"
				className="aspect-square !p-1 rounded-l-none"
				bg="bg-stone-600"
				disabled={!Boolean(next_height_step_size('file', $current_height, -1))}
				click_function={() => {
					change_height('file', -1);
				}}
			>
				<Minus />
			</Button>
		</div>
	</div>
	<div class="flex flex-col gap-2 p-2 overflow-hidden relative rounded-b-2xl">
		<div class="flex flex-col gap-2 p-2 bg-stone-750 rounded-xl">
			<PathBar />
			<div class="flex flex-row justify-between gap-6 overflow-x-auto">
				<div class="flex flex-row gap-2 shrink-0">
					<Button
						title="Neuen Ordner erstellen (Neuen Ordner mit ausgewählten Objekten erstellen)"
						className="px-3 flex"
						click_function={show_new_folder_popup}><FolderPlus /></Button
					>
					<div class="border border-stone-700 my-1"></div>
					<Button title="Datei(en) hochladen" className="px-3 flex"><Upload /></Button>
					<Button
						title="Ausgewählte Datei(en) herunterladen"
						className="px-3 flex"
						disabled={$selected_file_ids.length === 0}><Download /></Button
					>
					<div class="border border-stone-700 my-1"></div>
					<Button
						title="Aktuellen Ordner / Ausgewählte Datei(en) zwischen Bildschirmen synchronisieren"
						className="px-3 flex gap-3"
						><RefreshCcw />
						<span class="hidden 2xl:flex">Synchronisieren</span>
					</Button>
				</div>
				<div class="flex flex-row gap-2">
					<Button
						title="Ausgewählte Datei(en) ausschneiden"
						className="px-3 flex"
						disabled={$selected_file_ids.length === 0}><Scissors /></Button
					>
					<Button title="Ausgewählte Datei(en) einfügen" className="px-3 flex"
						><ClipboardPaste /></Button
					>
					<div class="border border-stone-700 my-1"></div>
					<Button
						title="Ausgewählte Datei umbenennen"
						className="px-3 flex"
						disabled={$selected_file_ids.length !== 1}><Pen /></Button
					>
					<Button
						title="Ausgewählte Datei(en) löschen"
						hover_bg="bg-red-400"
						active_bg="bg-red-500"
						className="px-3 flex"
						disabled={$selected_file_ids.length === 0}><Trash2 /></Button
					>
				</div>
			</div>
		</div>
		<div class="min-h-0 h-full overflow-y-auto bg-stone-750 rounded-xl">
			<div class="flex flex-col gap-2 p-2 min-h-0">
				{#if $selected_display_ids.length === 0}
					<span class="text-stone-450 px-10 py-6 leading-relaxed text-center">
						Es wurden keine Bildschirme ausgewählt.
					</span>
				{:else}
					{#each get_current_folder_elements($all_files, $current_file_path, $selected_display_ids) as folder_element (folder_element.id)}
						<section in:slide={{ duration: 100 }} class="outline-none">
							<FolderElementObject file={folder_element} />
						</section>
					{/each}
					{#if get_current_folder_elements($all_files, $current_file_path, $selected_display_ids).length === 0}
						<span class="text-stone-450 px-10 py-6 leading-relaxed text-center">
							Es sind keine Dateien auf {$selected_display_ids.length === 1
								? 'dem ausgewähltem Bildchirm'
								: 'den ausgewählten Bildschirmen'} vorhanden. Klicke auf <Upload
								class="inline pb-1"
							/> um Datei(en) hochzuladen.
						</span>
					{/if}
				{/if}
			</div>
		</div>
		<PopUp
			content={popup_content}
			close_function={popup_close_function}
			className="rounded-b-2xl"
			snippet_container_class="overflow-hidden"
		/>
	</div>
</div>
