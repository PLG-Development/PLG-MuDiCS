<script lang="ts">
	import { flip } from 'svelte/animate';
	import { get_shifted_color } from '../ts/stores/ui_behavior';
	import type { MenuOption } from '../ts/types';
	import { fade } from 'svelte/transition';

	let {
		className = '',
		bg = 'bg-stone-700',
		hover_bg = get_shifted_color(bg, 100),
		active_bg = get_shifted_color(bg, 200),
		disabled = false,
		title = '',
		click_function = (e: MouseEvent) => {},
		menu_options = null,
		menu_class = 'right-0',
		div_class = '',
		children
	} = $props<{
		className?: string;
		bg?: string;
		hover_bg?: string;
		active_bg?: string;
		disabled?: boolean;
		title?: string;
		click_function?: (e: MouseEvent) => void;
		menu_options?: MenuOption[] | null;
		menu_class?: string;
		div_class?: string;
		children?: any;
	}>();

	let menu_shown = $state(false);
	let button_element: HTMLButtonElement;
	let menu_element: HTMLDivElement | null = $state(null);
	let position_bottom = $state(true);

	function onclick(e: MouseEvent) {
		if (menu_options !== null) {
			if (menu_shown) {
				close_menu();
			} else {
				open_menu();
			}
		}
		click_function(e);
	}

	function getPolygon(): [number, number][] | null {
		if (!button_element || !menu_element) return null;
		const b = button_element.getBoundingClientRect();
		const m = menu_element.getBoundingClientRect();

		// get polygon coords
		if (position_bottom) {
			return [
				[b.left, b.top],
				[b.right, b.top],
				[m.right, m.top],
				[m.right, m.bottom],
				[m.left, m.bottom],
				[m.left, m.top],
				[b.left, b.top]
			];
		} else {
			return [
				[b.left, b.bottom],
				[b.right, b.bottom],
				[m.right, m.bottom],
				[m.right, m.top],
				[m.left, m.top],
				[m.left, m.bottom],
				[b.left, b.bottom]
			];
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (!menu_shown) return;
		const polygon = getPolygon();
		if (!polygon) return;

		const inside = pointInPolygon([e.clientX, e.clientY], polygon);
		if (!inside) {
			close_menu();
		}
	}

	function pointInPolygon(point: [number, number], polygon: [number, number][]) {
		let [x, y] = point;
		let inside = false;
		for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
			let [xi, yi] = polygon[i];
			let [xj, yj] = polygon[j];
			let intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
			if (intersect) inside = !inside;
		}
		return inside;
	}

	function is_enough_space_below(): boolean {
		if (!button_element || !menu_element) return true;
		const button_rectangle = button_element.getBoundingClientRect();
		const menu_height = menu_element.offsetHeight;
		const space_below_available = window.innerHeight - button_rectangle.bottom;

		return space_below_available > menu_height;
	}

	function open_menu() {
		menu_shown = true;
		window.addEventListener('mousemove', handleMouseMove);
		setTimeout(() => {
			position_bottom = is_enough_space_below();
		}, 0);
	}

	function close_menu() {
		window.removeEventListener('mousemove', handleMouseMove);
		menu_shown = false;
	}

	function no_option_has_icon(): boolean {
		for (const option of menu_options) {
			if (option.icon) {
				return false;
			}
		}
		return true;
	}
</script>

<div class="relative min-w-0 flex {div_class}" {title}>
	<button
		bind:this={button_element}
		class="{className} {menu_shown ? hover_bg : bg} {disabled
			? 'text-stone-500 cursor-not-allowed'
			: 'hover:' +
				hover_bg +
				' active:' +
				active_bg +
				' cursor-pointer'} p-2 rounded-xl flex justify-center items-center transition-colors duration-200"
		{disabled}
		{onclick}
	>
		{@render children()}
	</button>

	{#if menu_shown}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			bind:this={menu_element}
			transition:fade={{ duration: 50 }}
			class="absolute {position_bottom
				? 'top-full'
				: 'bottom-full'} {menu_class} z-100 my-1.5 min-w-64 rounded-xl backdrop-blur bg-black/20 border border-stone-400/10 shadow-xl/20 p-2 flex flex-col gap-2 text-stone-200 cursor-auto"
			onclick={(e) => {
				e.stopPropagation();
			}}
		>
			{#each menu_options as option}
				<button
					disabled={option.disabled ?? false}
					class="bg-white/15 {option.disabled
						? 'text-stone-500 cursor-not-allowed'
						: 'hover:bg-white/35 active:bg-white/60 cursor-pointer ' +
							option.class} rounded-lg p-2 transition-colors duration-200 select-none flex flex-row gap-2 items-center"
					onclick={(e) => {
						if (option.on_select) option.on_select();
						close_menu();
					}}
				>
					{#if !no_option_has_icon()}
						<div class="aspect-square h-[1.2rem]">
							{#if option.icon}
								{@const Icon = option.icon}
								<Icon class="size-full" />
							{/if}
						</div>
					{/if}
					<div class="truncate min-w-0" title={option.name}>
						{option.name}
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>
