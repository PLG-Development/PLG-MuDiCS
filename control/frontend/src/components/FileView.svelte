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
	import {
		all_files,
		current_file_path,
		get_current_folder_elements,
		get_display_ids_where_file_is_missing,
		get_display_ids_where_path_does_not_exist,
		get_file_by_id,
		get_longest_existing_path_and_needed_parts,
		run_for_selected_files_on_selected_displays,
		update_current_folder_on_selected_displays
	} from '../ts/stores/files';
	import { slide } from 'svelte/transition';
	import FolderElementObject from './FolderElementObject.svelte';
	import PopUp from './PopUp.svelte';
	import type { PopupContent } from '../ts/types';
	import TextInput from './TextInput.svelte';
	import { is_valid_name } from '../ts/utils';
	import { displays, get_display_by_id, run_on_all_selected_displays } from '../ts/stores/displays';
	import { create_folders, delete_files } from '../ts/api_handler';
	import { get } from 'svelte/store';
	import HighlightedText from './HighlightedText.svelte';

	let current_name: string = $state('');
	let current_valid: boolean = $state(false);

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
		current_name = '';
		current_valid = false;
		popup_content = {
			open: true,
			snippet: new_folder_popup,
			title: 'Neuen Ordner erstellen',
			title_icon: FolderPlus,
			closable: true
		};
	};

	const delete_folder_element_popup = () => {
		popup_content = {
			open: true,
			snippet: delete_request_popup,
			title: `${$selected_file_ids.length} ${$selected_file_ids.length === 1 ? 'Objekt' : 'Objekte'} wirklich löschen?`,
			title_icon: Trash2,
			closable: true
		};
	};
</script>

{#snippet new_folder_popup()}
	{#if get_display_ids_where_path_does_not_exist($current_file_path, $selected_display_ids, $all_files).length > 0}
		<span class="leading-relaxed"
			>Der aktuelle Pfad <HighlightedText
				>{$current_file_path.slice(0, $current_file_path.length - 1)}</HighlightedText
			> existiert nicht auf {get_display_ids_where_path_does_not_exist(
				$current_file_path,
				$selected_display_ids,
				$all_files
			).length === 1
				? 'dem Bildschirm'
				: 'den Bildschirmen'}
			{#each get_display_ids_where_path_does_not_exist($current_file_path, $selected_display_ids, $all_files) as display_id, i}
				{#if i !== 0}
					,
				{/if}
				<HighlightedText>{get_display_by_id(display_id, $displays)?.name}</HighlightedText>
			{/each}. Mit der Erstellung dieses Ordners wird der Pfad automatisch mit leeren Ordnern bis
			zum aktuellen Pfad aufgefüllt.
		</span>
	{/if}
	<TextInput
		focused_on_start={true}
		bind:current_value={current_name}
		bind:current_valid
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
	<div class="flex flex-row justify-end gap-2">
		<Button
			className="px-4 font-bold"
			click_function={async () => {
				for (const display_id of $selected_display_ids) {
					const display = get_display_by_id(display_id, $displays);
					if (!display) continue;
					const path_data = get_longest_existing_path_and_needed_parts(
						$current_file_path,
						display_id,
						$all_files
					);
					await create_folders(display.ip, path_data.existing, [...path_data.needed, current_name]);
				}
				await update_current_folder_on_selected_displays();
				popup_close_function();
			}}
			disabled={!current_valid}>Neuen Ordner erstellen</Button
		>
	</div>
{/snippet}

{#snippet delete_request_popup()}
	<div class="flex flex-col gap-1 h-full min-h-0 grow-0">
		<span class="text-stone-400 px-1"
			>{`${$selected_file_ids.length === 1 ? 'Folgendes Objekt' : `Folgende ${$selected_file_ids.length} Objekte`} löschen? (Wiederherstellung nicht möglich)`}</span
		>
		<div class="flex flex-col gap-2 overflow-auto h-full min-h-0 grow-0">
			{#each $selected_file_ids
				.map((file_id) => get_file_by_id(file_id, $all_files, $current_file_path))
				.filter((element) => element !== null) as file}
				<FolderElementObject {file} not_interactable />
			{/each}
		</div>
	</div>
	<div class="flex flex-row justify-end gap-2">
		<Button className="px-4 font-bold" click_function={popup_close_function}>Abbrechen</Button>
		<Button
			hover_bg="bg-red-400"
			active_bg="bg-red-500"
			className="px-4 flex text-red-400 hover:text-stone-100"
			click_function={async () => {
				await run_for_selected_files_on_selected_displays(
					async (ip: string, file_names: string[]) => {
						delete_files(ip, $current_file_path, file_names);
					}
				);
				await update_current_folder_on_selected_displays();
				selected_file_ids.update(() => {
					return [];
				});
				popup_close_function();
			}}>Löschen</Button
		>
	</div>
{/snippet}

{#snippet clipboard_hover_snippet()}
	<div></div>
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
			<div class="flex flex-row justify-between gap-6">
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
						disabled={$selected_file_ids.length === 0}
						click_function={delete_folder_element_popup}><Trash2 /></Button
					>
				</div>
			</div>
		</div>
		<div class="min-h-0 h-full overflow-y-auto bg-stone-750 rounded-xl">
			<div class="flex flex-col gap-2 p-2 min-h-0 max-w-full">
				{#if $selected_display_ids.length === 0}
					<span class="text-stone-450 px-10 py-6 leading-relaxed text-center">
						Es sind keine Bildschirme ausgewählt.
					</span>
				{:else}
					{#each get_current_folder_elements($all_files, $current_file_path, $selected_display_ids) as folder_element (folder_element.id)}
						<section in:slide={{ duration: 100 }} class="outline-none">
							<FolderElementObject file={folder_element} />
						</section>
					{/each}
					{#if get_current_folder_elements($all_files, $current_file_path, $selected_display_ids).length === 0}
						<span class="text-stone-450 px-10 py-6 leading-relaxed text-center max-w-full">
							Es existieren keine Dateien auf {$selected_display_ids.length === 1
								? 'dem ausgewähltem Bildchirm'
								: 'den ausgewählten Bildschirmen'} im aktuellen Ordner. Klicke auf <HighlightedText
								bg="bg-stone-700"
								fg="text-stone-400"
								className="!p-1"><Upload class="inline pb-1" /></HighlightedText
							> um Datei(en) hochzuladen.
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
