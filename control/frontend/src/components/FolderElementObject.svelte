<script lang="ts">
	import { ArrowRight, Folder, Play, RefreshCcwDot, TriangleAlert } from 'lucide-svelte';
	import {
		current_height,
		get_selectable_color_classes,
		get_shifted_color
	} from '../ts/stores/ui_behavior';
	import Button from './Button.svelte';
	import { supported_file_types, type FolderElement, type SupportedFileType } from '../ts/types';
	import {
		is_selected,
		select,
		selected_display_ids,
		selected_file_ids
	} from '../ts/stores/select';
	import {
		all_files,
		change_file_path,
		current_file_path,
		get_display_ids_where_file_is_missing
	} from '../ts/stores/files';
	import RefreshPlay from './RefreshPlay.svelte';

	let { file } = $props<{ file: FolderElement }>();

	const is_folder = file.type === 'inode/directory';

	function get_file_type(file: FolderElement): SupportedFileType | null {
		for (const key of Object.keys(supported_file_types)) {
			if (file.type === supported_file_types[key].mime_type) {
				return supported_file_types[key];
			}
		}
		// Fallback:
		const extension = file.name.split('.').pop();
		if (extension) {
			if (Object.keys(supported_file_types).includes('.' + extension)) {
				return supported_file_types['.' + extension];
			}
		}
		return null;
	}

	function get_created_string(date_object: Date, full_string = false) {
		if (full_string) {
			return (
				get_formated_date_string(date_object, true) + ' ' + get_formated_time_string(date_object)
			);
		} else if (date_object.toDateString() === new Date().toDateString()) {
			return get_formated_time_string(date_object);
		} else {
			return get_formated_date_string(date_object);
		}
	}

	function get_formated_time_string(date_object: Date) {
		return `${date_object.getHours().toString().padStart(2, '0')}:${date_object.getMinutes().toString().padStart(2, '0')}`;
	}

	function get_formated_date_string(date_object: Date, full_year = false) {
		return `${date_object.getDate().toString().padStart(2, '0')}.${(date_object.getMonth() + 1).toString().padStart(2, '0')}.${date_object
			.getFullYear()
			.toString()
			.slice(full_year ? 0 : 2)}`;
	}

	function get_grayed_out_text_color_strings(is_selected: boolean): string {
		const color = is_selected ? 'text-stone-600' : 'text-stone-400';
		const factor = is_selected ? -1 : 1;
		return `${color} group-hover:${get_shifted_color(color, factor * 100)} group-active:${get_shifted_color(color, factor * 150)}`;
	}

	function get_grayed_out_border_color_strings(is_selected: boolean): string {
		const color = is_selected ? 'border-stone-450' : 'border-stone-550';
		const factor = is_selected ? 1 : 1;
		return `${color} group-hover:${get_shifted_color(color, factor * 100)} group-active:${get_shifted_color(color, factor * 150)}`;
	}

	function onclick(e: Event) {
		select(selected_file_ids, file.id);
		e.stopPropagation();
	}

	function open() {
		if (is_folder) {
			change_file_path($current_file_path + file.name + '/');
		} else {
			// TODO
		}
	}
</script>

<div class="flex flex-row h-{$current_height.file} w-full">
	<div class="h-{$current_height.file} aspect-square max-w-15 flex">
		<Button
			className="flex rounded-l-lg rounded-r-none {is_folder
				? 'text-stone-450'
				: 'text-stone-800'} w-full"
			div_class="w-full"
			bg={get_selectable_color_classes(
				!is_folder,
				{
					bg: true
				},
				-50
			)}
			hover_bg={get_selectable_color_classes(
				!is_folder,
				{
					bg: true
				},
				50
			)}
			active_bg={get_selectable_color_classes(
				!is_folder,
				{
					bg: true
				},
				100
			)}
			click_function={(e) => {
				open();
				e.stopPropagation();
			}}
		>
			{#if is_folder}
				<ArrowRight class="size-full" strokeWidth="3" />
			{:else if get_display_ids_where_file_is_missing($current_file_path, file, $selected_display_ids, $all_files)[0].length !== 0}
				<RefreshPlay className="size-full" />
			{:else}
				<Play class="size-full" strokeWidth="3" />
			{/if}
		</Button>
	</div>
	<div
		role="button"
		tabindex="0"
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') onclick(e);
		}}
		{onclick}
		class="{get_selectable_color_classes(is_selected(file.id, $selected_file_ids), {
			bg: true,
			hover: true,
			active: true,
			text: true
		})} rounded-r-lg transition-colors duration-200 gap-4 flex flex-row justify-between cursor-pointer group w-full h-full min-w-0"
	>
		<div class="flex flex-row gap-2 min-w-0 w-full">
			<div class="aspect-square rounded-md flex justify-center items-center p-2">
				{#if is_folder}
					<Folder class="size-full" />
				{:else if file.thumbnail}
					<div></div>
				{:else if get_file_type(file)?.icon}
					{@const Icon = get_file_type(file)?.icon}
					<Icon class="size-full" />
				{/if}
			</div>
			<div class="content-center truncate select-none w-full" title={file.name}>
				{file.name.includes('.') ? file.name.slice(0, file.name.lastIndexOf('.')) : file.name}
			</div>
		</div>
		<div
			class=" p-1 flex flex-row items-center gap-1 pr-1 {get_grayed_out_text_color_strings(
				is_selected(file.id, $selected_file_ids)
			)} duration-200 transition-colors"
		>
			{#if get_display_ids_where_file_is_missing($current_file_path, file, $selected_display_ids, $all_files)[1].length !== 0}
				<Button
					className="h-8 aspect-square transition-colors duration-200 !p-1.5 text-stone-100"
					bg="bg-red-500"
					click_function={(e) => {
						e.stopPropagation();
					}}
				>
					<TriangleAlert class="size-full" />
				</Button>
			{:else if get_display_ids_where_file_is_missing($current_file_path, file, $selected_display_ids, $all_files)[0].length !== 0}
				<Button
					className="h-8 aspect-square transition-colors duration-200 !p-1.5"
					bg="bg-transparent"
					hover_bg={get_selectable_color_classes(false, {
						bg: true
					})}
					active_bg={get_selectable_color_classes(false, {
						bg: true
					})}
					click_function={(e) => {
						e.stopPropagation();
					}}
				>
					<RefreshCcwDot class="size-full" />
				</Button>
			{/if}
			<div
				class="w-14 content-center text-center select-none text-xs whitespace-nowrap"
				title={get_created_string(file.date_created, true)}
			>
				{get_created_string(file.date_created)}
			</div>
			<div
				class="h-[70%] border {get_grayed_out_border_color_strings(
					is_selected(file.id, $selected_file_ids)
				)} duration-200 transition-colors my-1"
			></div>
			<div
				class="w-12 content-center text-center select-none text-xs whitespace-nowrap truncate"
				title={file.type}
			>
				{is_folder ? 'Ordner' : (get_file_type(file)?.display_name ?? '?')}
			</div>
			<div
				class="h-[70%] border {get_grayed_out_border_color_strings(
					is_selected(file.id, $selected_file_ids)
				)} duration-200 transition-colors"
			></div>
			<div class="w-12 content-center text-center select-none text-xs whitespace-nowrap">
				{file.size}
			</div>
		</div>
	</div>
</div>
