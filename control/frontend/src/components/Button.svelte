<script lang="ts">
	import { get_shifted_color } from '../ts/stores/ui_behavior';
	import type { MenuOption } from '../ts/types';

	let {
		className = '',
		bg = 'bg-stone-700',
		hover_bg = get_shifted_color(bg, 100),
		active_bg = get_shifted_color(bg, 200),
		disabled = false,
		click_function = (e: MouseEvent) => {},
		menu_options = null,
		children
	} = $props<{
		className?: string;
		bg?: string;
		hover_bg?: string;
		active_bg?: string;
		disabled?: boolean;
		click_function?: (e: MouseEvent) => void;
		menu_options?: MenuOption[]|null;
		children?: any;
	}>();

	if (menu_options !== null) {

	}
</script>

<button
	class="{className} {bg} {disabled ? "text-stone-500 cursor-not-allowed" : "hover:"+hover_bg+" active:"+active_bg+" cursor-pointer"} p-2 rounded-xl flex justify-center items-center transition-colors duration-200"
	{disabled}
	onclick={click_function}
>
	{@render children()}
</button>

