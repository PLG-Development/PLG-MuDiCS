<script lang="ts">
	import { ArrowRight, Ban, FileIcon, Folder, Play } from 'lucide-svelte';
	import {
		current_height,
		get_selectable_color_classes,
		get_shifted_color
	} from '$lib/ts/stores/ui_behavior';
	import Button from '$lib/components/Button.svelte';
	import {
		supported_file_type_icon,
		type Inode,
		get_file_primary_key,
		type FileOnDisplay
	} from '$lib/ts/types';

	import {
		is_selected,
		select,
		selected_display_ids,
		selected_file_ids
	} from '$lib/ts/stores/select';
	import {
		change_file_path,
		current_file_path,
		get_date_mapping,
		get_missing_colliding_display_ids
	} from '$lib/ts/stores/files';
	import RefreshPlay from '../svgs/RefreshPlay.svelte';
	import { get_file_size_display_string, get_file_type } from '$lib/ts/utils';
	import { open_file } from '$lib/ts/api_handler';
	import { run_on_all_selected_displays } from '$lib/ts/stores/displays';
	import { get_thumbnail_url } from '$lib/ts/stores/thumbnails';
	import { liveQuery, type Observable } from 'dexie';
	import { db } from '$lib/ts/files_display.db';

	let { file, not_interactable = false }: { file: Inode; not_interactable?: boolean } = $props();

	let missing_colliding_displays_ids:
		| Observable<{ missing: string[]; colliding: string[] }>
		| undefined = $state();
	$effect(() => {
		const s = $selected_file_ids;
		missing_colliding_displays_ids = liveQuery(() => get_missing_colliding_display_ids(file, s));
	});

	let loading_data:
		| Observable<{
				is_loading: boolean;
				total_percentage: number;
				display_data: { is_loading: boolean; percentage: number }[];
		  }>
		| undefined = $state();
	$effect(() => {
		const d = $selected_display_ids;
		loading_data = liveQuery(() => get_loading_data(get_file_primary_key(file), d));
	});

	let thumbnail_url = liveQuery(() => get_thumbnail_url(get_file_primary_key(file)));
	let date_mapping: Observable<Record<string, Date>> = liveQuery(() =>
		get_date_mapping(get_file_primary_key(file))
	);

	const is_folder = file.type === 'inode/directory';

	function get_created_info(date_mapping: Record<string, Date> | undefined, full_string = false) {
		if (!date_mapping) return '';
		const keys = Object.keys(date_mapping);
		if (keys.length === 0) return '';

		if (keys.length === 1) return get_formated_created_string(date_mapping[keys[0]], full_string);

		let out = '';
		let is_different = false;
		const first_formated_created_string = get_formated_created_string(
			date_mapping[keys[0]],
			full_string
		);
		out += `${keys[0]}: ${first_formated_created_string}`;

		for (const key of keys.splice(0, 1)) {
			const current_formated_created_string = get_formated_created_string(
				date_mapping[key],
				full_string
			);
			if (!is_different && current_formated_created_string !== first_formated_created_string)
				is_different = true;
			out += `\n${key}: ${current_formated_created_string}`;
		}

		if (full_string) {
			return is_different ? out : first_formated_created_string;
		} else {
			return is_different ? 'versch.' : first_formated_created_string;
		}
	}

	function get_formated_created_string(date_object: Date, full_string: boolean) {
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
		if (not_interactable) return 'text-stone-400';
		if ($loading_data?.is_loading) return 'text-white/20';
		const color = is_selected ? 'text-stone-600' : 'text-stone-400';
		const factor = is_selected ? -1 : 1;
		return `${color} group-hover:${get_shifted_color(color, factor * 100)} group-active:${get_shifted_color(color, factor * 150)}`;
	}

	function get_grayed_out_border_color_strings(is_selected: boolean): string {
		if (not_interactable) return 'border-stone-550';
		if ($loading_data?.is_loading) return 'border-white/10';
		const color = is_selected ? 'border-stone-450' : 'border-stone-550';
		const factor = is_selected ? 1 : 1;
		return `${color} group-hover:${get_shifted_color(color, factor * 100)} group-active:${get_shifted_color(color, factor * 150)}`;
	}

	function onclick(e: Event) {
		if (not_interactable || $loading_data?.is_loading) return;
		select(selected_file_ids, get_file_primary_key(file), 'toggle');
		e.stopPropagation();
	}

	async function open() {
		if (is_folder) {
			await change_file_path($current_file_path + file.name + '/');
		} else {
			const path_to_file = $current_file_path + file.name;
			await run_on_all_selected_displays(open_file, true, path_to_file);
		}
	}

	function get_main_classes(): string {
		let out = '';

		if ($loading_data?.is_loading) {
			out += 'bg-stone-700 text-white/30';
		} else {
			out += get_selectable_color_classes(
				!not_interactable && is_selected(get_file_primary_key(file), $selected_file_ids),
				{
					bg: true,
					hover: !not_interactable,
					active: !not_interactable,
					text: true
				}
			);
		}

		if (not_interactable) {
			out += ' rounded-lg';
		} else if ($loading_data?.is_loading) {
			out += ' rounded-r-lg';
		} else {
			out += ' rounded-r-lg cursor-pointer';
		}

		return out;
	}

	async function get_loading_data(
		file_primary_key: string,
		selected_display_ids: string[]
	): Promise<{
		is_loading: boolean;
		total_percentage: number;
		display_data: { is_loading: boolean; percentage: number }[];
	}> {
		const file_on_display_data: FileOnDisplay[] = await db.files_on_display
			.where('file_primary_key')
			.equals(file_primary_key)
			.filter((e) => selected_display_ids.includes(e.display_id))
			.toArray();
		if (file_on_display_data.length === 0) {
			return {
				is_loading: true,
				total_percentage: 0,
				display_data: []
			};
		}
		const display_data = [];
		let is_loading = false;
		let percentage_sum = 0;
		for (const fod of file_on_display_data) {
			if (!is_loading) is_loading = fod.is_loading;
			percentage_sum += fod.percentage;
			display_data.push({
				is_loading: fod.is_loading,
				percentage: fod.percentage
			});
		}
		let total_percentage = percentage_sum / display_data.length;
		return {
			is_loading,
			total_percentage,
			display_data
		};
	}
</script>

<div data-testid="inode" class="flex flex-row h-{$current_height.file} w-full">
	{#if !not_interactable}
		<div class="h-{$current_height.file} aspect-square max-w-15 flex">
			<Button
				disabled={!is_folder && get_file_type(file) === null}
				title={!is_folder && get_file_type(file) === null ? 'Dateityp nicht unterstützt' : ''}
				className="flex rounded-l-lg rounded-r-none {is_folder
					? 'text-stone-450'
					: 'text-stone-800'} w-full"
				div_class="w-full"
				bg={get_selectable_color_classes(
					!is_folder && get_file_type(file) !== null,
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
				{:else if $missing_colliding_displays_ids && $missing_colliding_displays_ids.missing.length !== 0}
					<RefreshPlay className="size-full" />
				{:else if get_file_type(file) !== null}
					<Play class="size-full" strokeWidth="3" />
				{:else}
					<Ban class="size-full" strokeWidth="3" />
				{/if}
			</Button>
		</div>
	{/if}
	<div
		role="button"
		tabindex="0"
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') onclick(e);
		}}
		{onclick}
		class="{get_main_classes()} relative transition-colors duration-200 gap-4 flex flex-row justify-between group w-full min-w-0"
	>
		{#if $loading_data?.is_loading}
			<!-- <div class="pointer-events-none absolute inset-0"> -->
				<div
					class="absolute pointer-events-none inset-y-0 left-0 transition-[width] duration-200 bg-stone-600 rounded-r-lg"
					style={`width: ${$loading_data.total_percentage}%;`}
				></div>
			<!-- </div> -->
		{/if}
		<div class="flex flex-row gap-2 min-w-0 w-full z-10">
			<div class="aspect-square rounded-md flex justify-center items-center">
				{#if is_folder}
					<Folder class="size-full p-2" />
				{:else if $thumbnail_url || null}
					<img
						src={$thumbnail_url || null}
						alt="ERR"
						class="object-contain size-full select-none block p-1 rounded-lg text-center content-center text-red-300"
						draggable="false"
					/>
				{:else if supported_file_type_icon[get_file_type(file)?.display_name || '']}
					{@const Icon = supported_file_type_icon[get_file_type(file)?.display_name || '']}
					<Icon class="size-full p-2" />
				{:else}
					<FileIcon class="size-full p-2" />
				{/if}
			</div>
			<div class="content-center truncate select-none w-full" title={file.name}>
				{file.name.includes('.') && !is_folder && get_file_type(file)
					? file.name.slice(0, file.name.lastIndexOf('.'))
					: file.name}
			</div>
		</div>
		<div
			class=" p-1 flex flex-row items-center gap-1 pr-1 z-10 {get_grayed_out_text_color_strings(
				is_selected(get_file_primary_key(file), $selected_file_ids)
			)} duration-200 transition-colors"
		>
			<!-- {#if get_display_ids_where_file_is_missing($current_file_path, file, $selected_display_ids, $all_files)[1].length !== 0}
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
			{/if} -->
			<div
				class="w-14 content-center text-center select-none text-xs whitespace-nowrap"
				title={get_created_info($date_mapping, true)}
			>
				{get_created_info($date_mapping)}
			</div>
			<div
				class="h-[70%] border {get_grayed_out_border_color_strings(
					is_selected(get_file_primary_key(file), $selected_file_ids)
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
					is_selected(get_file_primary_key(file), $selected_file_ids)
				)} duration-200 transition-colors"
			></div>
			<div
				class="w-12 content-center text-center select-none text-xs whitespace-nowrap"
				title={get_file_size_display_string(file.size, 3)}
			>
				{get_file_size_display_string(file.size)}
			</div>
		</div>
	</div>
</div>
