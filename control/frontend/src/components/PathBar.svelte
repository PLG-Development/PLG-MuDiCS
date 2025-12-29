<script lang="ts">
	import { ChevronRight, House } from 'lucide-svelte';
	import Button from './Button.svelte';
	import { onDestroy, onMount } from 'svelte';
	import type { MenuOption } from '../ts/types';
	import { change_file_path, current_file_path } from '../ts/stores/files';
	import { fade } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';

	let {
		bg = 'bg-stone-700'
	}: {
		bg?: string;
	} = $props();

	let outside_container: HTMLDivElement;
	let inside_container: HTMLDivElement;
	let resize_observer: ResizeObserver;
	let w10_div: HTMLDivElement;

	let cut_folders: number = $state(0);
	// let folders_length: number = $state(get_folders($current_file_path).length);
	// let all_folders_length: number = $state(get_folders($current_file_path).length);

	function get_folders(path: string): string[] {
		path = path.slice(1); // Cut first '/'
		if (path === '') return [];
		if (path.endsWith('/')) {
			path = path.slice(0, path.length - 1);
		}
		return path.split('/');
	}

	function get_sliced_folders(path: string, cut_folders: number): string[] {
		const folders = get_folders(path);
		let sliced_folders: string[] = [];
		if (cut_folders !== get_folders($current_file_path).length)
			sliced_folders = folders.slice(cut_folders);
		return sliced_folders;
	}

	function get_hidden_folders(path: string, cut_folders: number): string[] {
		const folders = get_folders(path);
		let hidden_folders: string[] = [];
		if (cut_folders !== get_folders($current_file_path).length)
			hidden_folders = folders.slice(0, cut_folders);
		return hidden_folders;
	}

	function recalc() {
		if (!outside_container || !inside_container || !w10_div) return;
		const first_shrink = cut_folders === 0;
		const second_last_grow = cut_folders === 2;

		const difference = outside_container.offsetWidth - inside_container.offsetWidth;

		const w10_px = parseFloat(getComputedStyle(w10_div).width);

		if ((!first_shrink && difference < 2 * w10_px) || (first_shrink && difference < w10_px)) {
			if (cut_folders < get_folders($current_file_path).length) {
				cut_folders += first_shrink ? 2 : 1;
			}
		} else if (
			(!second_last_grow && difference > 6 * w10_px) ||
			(second_last_grow && difference > 7 * w10_px)
		) {
			if (cut_folders >= 1) {
				if (second_last_grow) {
					cut_folders -= 2;
				} else {
					cut_folders -= 1;
				}
			}
		}
	}

	function get_hidden_menu_options(hidden_folders: string[], path: string): MenuOption[] {
		const out: MenuOption[] = [];
		for (let i = 0; i < hidden_folders.length; i++) {
			out.push({
				name: '  '.repeat(i) + hidden_folders[i],
				class: 'truncate max-w-80',
				on_select: async () => {
					await open_path(i + 1, path);
				}
			});
		}
		return out;
	}

	async function open_path(index_of_all_folders: number, path: string) {
		let new_path = '/';
		const all_folders = get_folders(path);
		for (let i = 0; i < index_of_all_folders; i++) {
			new_path += all_folders[i] + '/';
		}
		await change_file_path(new_path);
	}

	onMount(() => {
		resize_observer = new ResizeObserver(() => recalc());
		resize_observer.observe(outside_container);
		resize_observer.observe(inside_container);
		// initial
		setTimeout(recalc, 0);
	});
	onDestroy(() => resize_observer?.disconnect());
</script>

<div class="{bg} rounded-xl flex" bind:this={outside_container}>
	<div class="flex flex-row">
		<div class="flex flex-row">
			<div bind:this={w10_div} class="flex">
				<Button
					className="py-1 shrink-0 grow-0 w-10"
					{bg}
					click_function={async () => {
						await open_path(0, $current_file_path);
					}}
				>
					<House
						class="size-full transition-all duration-100"
						strokeWidth={$current_file_path === '/' ? 2.7 : 2}
					/>
				</Button>
			</div>
			{#if cut_folders !== 0}
				<Button
					className="pl-0 py-1 grow"
					{bg}
					menu_options={get_hidden_menu_options(
						get_hidden_folders($current_file_path, cut_folders),
						$current_file_path
					)}
					menu_class="left-0"
				>
					<ChevronRight class="shrink-0 text-stone-500 h-full" />
					<span class="font-bold" title="Weiteren Pfad zeigen"> ... </span>
				</Button>
			{/if}
		</div>
		<div class="flex flex-row" bind:this={inside_container}>
			{#each get_sliced_folders($current_file_path, cut_folders) as folder, i (i)}
				<div animate:flip={{ duration: 100, easing: cubicOut }}>
					<Button
						className="shrink-0 py-1 pl-0 {i ===
						get_sliced_folders($current_file_path, cut_folders).length - 1
							? 'max-w-80 font-bold'
							: 'max-w-30'}"
						{bg}
						click_function={async () => {
							await open_path(cut_folders + i + 1, $current_file_path);
						}}
					>
						<ChevronRight class="shrink-0 text-stone-500 h-full" />
						<span class="truncate" title={folder}>
							{folder}
						</span>
					</Button>
				</div>
			{/each}
		</div>
	</div>
</div>
