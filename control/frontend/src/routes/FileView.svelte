<script lang="ts">
	import {
		ClipboardPaste,
		Download,
		FolderPlus,
		Pen,
		RefreshCcw,
		Scissors,
		Trash2,
		Upload,
		ZoomIn,
		ZoomOut
	} from 'lucide-svelte';
	import { change_height, current_height, next_height_step_size } from '$lib/ts/stores/ui_behavior';
	import Button from '$lib/components/Button.svelte';
	import PathBar from './PathBar.svelte';
	import { selected_display_ids, selected_file_ids } from '$lib/ts/stores/select';
	import {
		current_file_path,
		get_current_folder_elements,
		get_file_by_id,
		run_for_selected_files_on_selected_displays,
		update_current_folder_on_selected_displays,
		get_displays_where_path_exists,
		create_folder_on_all_selected_displays
	} from '$lib/ts/stores/files';
	import { slide } from 'svelte/transition';
	import InodeElement from '../lib/components/InodeElement.svelte';
	import PopUp from '$lib/components/PopUp.svelte';
	import { get_file_primary_key, type Inode, type PopupContent } from '$lib/ts/types';
	import TextInput from '$lib/components/TextInput.svelte';
	import { is_valid_name } from '$lib/ts/utils';
	import { delete_files, rename_file } from '$lib/ts/api_handler';
	import HighlightedText from '$lib/components/HighlightedText.svelte';
	import { liveQuery, type Observable } from 'dexie';

	let current_name: string = $state('');
	let current_valid: boolean = $state(false);

	let display_names_where_path_does_not_exist: string[] = $state([]);
	let selected_files: Observable<Inode[]> | undefined = $state();
	$effect(() => {
		const s = $selected_file_ids;
		selected_files = liveQuery(() => get_selected_files(s));
	});
	let current_folder_elements: Observable<Inode[]> | undefined = $state();
	$effect(() => {
		const path = $current_file_path,
			display_ids = $selected_display_ids;
		current_folder_elements = liveQuery(() => get_current_folder_elements(path, display_ids));
	});

	let popup_content: PopupContent = $state({
		open: false,
		snippet: null,
		title: '',
		closable: true
	});

	async function get_selected_files(selected_file_ids: string[]): Promise<Inode[]> {
		try {
			const results = await Promise.all(selected_file_ids.map((id) => get_file_by_id(id)));
			return results.filter((element) => element !== null);
		} catch (e: unknown) {
			console.error('Error on generating selected_files');
			return [];
		}
	}

	function popup_close_function() {
		popup_content.open = false;
	}

	async function create_new_folder() {
		popup_close_function();
		await create_folder_on_all_selected_displays(
			current_name.trim(),
			$current_file_path,
			$selected_display_ids
		);
		await update_current_folder_on_selected_displays();
	}

	async function edit_file_name(new_file_name: string) {
		popup_close_function();
		await run_for_selected_files_on_selected_displays(async (ip: string, file_names: string[]) => {
			if (file_names.length !== 1) {
				console.log('EEEERRRRROOOOOOR', file_names);
				return; // Error
			}
			await rename_file(ip, $current_file_path, file_names[0], new_file_name);
		});
		await update_current_folder_on_selected_displays();
	}

	const show_edit_file_popup = async () => {
		const file = await get_file_by_id($selected_file_ids[0]);
		if (!file) return;
		const is_folder = file.type === 'inode/directory';
		const extension = is_folder ? '' : '.' + file.name.split('.').at(-1) || '';
		current_name = file.name.slice(0, file.name.length - extension.length);
		current_valid = true;
		popup_content = {
			open: true,
			snippet: edit_file_name_popup,
			title: `${is_folder ? 'Ordner' : 'Datei'} umbenennen`,
			title_icon: FolderPlus,
			snippet_arg: extension,
			closable: true
		};
	};

	const show_new_folder_popup = async () => {
		current_name = '';
		current_valid = false;
		display_names_where_path_does_not_exist = (
			await get_displays_where_path_exists($current_file_path, $selected_display_ids, true)
		).map((display) => display.name);
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
	{#if display_names_where_path_does_not_exist.length > 0}
		<span class="leading-relaxed"
			>Der aktuelle Pfad <HighlightedText
				>{$current_file_path.slice(0, $current_file_path.length - 1)}</HighlightedText
			> existiert nicht auf {display_names_where_path_does_not_exist.length === 1
				? 'dem Bildschirm'
				: 'den Bildschirmen'}
			{#each display_names_where_path_does_not_exist as display_name, i}
				{#if i !== 0}
					,
				{/if}
				<HighlightedText>{display_name}</HighlightedText>
			{/each}. Mit der Erstellung dieses Ordners wird der Pfad automatisch mit leeren Ordnern bis
			zum aktuellen Pfad aufgefüllt.
		</span>
	{/if}
	<TextInput
		focused_on_start={true}
		bind:current_value={current_name}
		bind:current_valid
		title="Ordnername"
		is_valid_function={async (input: string) => {
			if (input.startsWith('.')) return [false, 'Name darf nicht mit . beginnen'];
			const trimmed_input = input.trim();
			if (trimmed_input.length === 0 || trimmed_input.length > 50)
				return [false, 'Ungültige Länge'];
			if (!is_valid_name(trimmed_input)) return [false, 'Name enthält ungültige Zeichen'];
			if (($current_folder_elements ?? []).some((e) => e.name === trimmed_input))
				return [false, 'Name bereits verwendet'];
			return [true, 'Gültiger Name'];
		}}
		enter_mode="submit"
		enter_function={create_new_folder}
	/>
	<div class="flex flex-row justify-end gap-2">
		<Button className="px-4 font-bold" click_function={create_new_folder} disabled={!current_valid}
			>Neuen Ordner erstellen</Button
		>
	</div>
{/snippet}

{#snippet edit_file_name_popup(extension: string)}
	<TextInput
		focused_on_start={true}
		bind:current_value={current_name}
		bind:current_valid
		title="Neuer {extension === '' ? 'Ordner' : 'Datei'}name"
		is_valid_function={async (input: string) => {
			if (input.startsWith('.')) return [false, 'Name darf nicht mit . beginnen'];
			const trimmed_input = input.trim() + extension;
			if (trimmed_input.length === 0 || trimmed_input.length > 50)
				return [false, 'Ungültige Länge'];
			if (!is_valid_name(trimmed_input)) return [false, 'Name enthält ungültige Zeichen'];
			if (
				($current_folder_elements ?? []).some(
					(e) => e.name === trimmed_input && get_file_primary_key(e) !== $selected_file_ids[0]
				)
			)
				return [false, 'Name bereits verwendet'];
			return [true, 'Gültiger Name'];
		}}
		enter_mode="submit"
		enter_function={async () => await edit_file_name(current_name.trim() + extension)}
		{extension}
	/>
	<div class="flex flex-row justify-end gap-2">
		<Button
			className="px-4 font-bold"
			click_function={async () => await edit_file_name(current_name.trim() + extension)}
			disabled={!current_valid}>{extension === '' ? 'Ordner' : 'Datei'} umbenennen</Button
		>
	</div>
{/snippet}

{#snippet delete_request_popup()}
	<div class="flex flex-col gap-1 h-full min-h-0 grow-0">
		<span class="text-stone-400 px-1"
			>{`${$selected_file_ids.length === 1 ? 'Folgendes Objekt' : `Folgende ${$selected_file_ids.length} Objekte`} löschen? (Wiederherstellung nicht möglich)`}</span
		>
		<div class="flex flex-col gap-2 overflow-auto h-full min-h-0 grow-0">
			{#each $selected_files || [] as file}
				<InodeElement {file} not_interactable />
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
				popup_close_function();
				await run_for_selected_files_on_selected_displays(
					async (ip: string, file_names: string[]) => {
						await delete_files(ip, $current_file_path, file_names);
					}
				);
				await update_current_folder_on_selected_displays();
			}}>Löschen</Button
		>
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
				className="aspect-square p-1! rounded-r-none"
				bg="bg-stone-600"
				disabled={!Boolean(next_height_step_size('file', $current_height, 1))}
				click_function={() => {
					change_height('file', 1);
				}}
			>
				<ZoomIn />
			</Button>
			<Button
				title="Dateien kleiner darstellen"
				className="aspect-square p-1! rounded-l-none"
				bg="bg-stone-600"
				disabled={!Boolean(next_height_step_size('file', $current_height, -1))}
				click_function={() => {
					change_height('file', -1);
				}}
			>
				<ZoomOut />
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
						click_function={show_new_folder_popup}
						disabled={$selected_display_ids.length === 0}><FolderPlus /></Button
					>
					<div class="border border-stone-700 my-1"></div>
					<Button
						title="Datei(en) hochladen"
						className="px-3 flex"
						disabled={$selected_display_ids.length === 0}><Upload /></Button
					>
					<Button
						title="Ausgewählte Datei(en) herunterladen"
						className="px-3 flex"
						disabled={$selected_file_ids.length === 0}><Download /></Button
					>
					<div class="border border-stone-700 my-1"></div>
					<Button
						title="Aktuellen Ordner / Ausgewählte Datei(en) zwischen Bildschirmen synchronisieren"
						className="px-3 flex gap-3"
						disabled={$selected_display_ids.length === 0}
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
					<Button
						title="Ausgewählte Datei(en) einfügen"
						className="px-3 flex"
						disabled={$selected_display_ids.length === 0}
					>
						<ClipboardPaste />
					</Button>
					<div class="border border-stone-700 my-1"></div>
					<Button
						title="Ausgewählte Datei umbenennen"
						className="px-3 flex"
						click_function={show_edit_file_popup}
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
					{#each $current_folder_elements ?? [] as folder_element (get_file_primary_key(folder_element))}
						<section in:slide={{ duration: 100 }} class="outline-none">
							<InodeElement file={folder_element} />
						</section>
					{/each}
					{#if ($current_folder_elements ?? []).length === 0}
						<span class="text-stone-450 px-10 py-6 leading-relaxed text-center max-w-full">
							Es existieren keine Dateien auf {$selected_display_ids.length === 1
								? 'dem ausgewähltem Bildchirm'
								: 'den ausgewählten Bildschirmen'} im aktuellen Ordner. Klicke auf <HighlightedText
								bg="bg-stone-700"
								fg="text-stone-400"
								className="p-1!"><Upload class="inline pb-1" /></HighlightedText
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
			snippet_container_class="overflow-hidden min-w-90"
		/>
	</div>
</div>
