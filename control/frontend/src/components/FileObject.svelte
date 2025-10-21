<script lang="ts">
	import { CloudAlert, Folder, RefreshCcwDot, Shield } from 'lucide-svelte';
	import { get_selectable_color_classes } from '../ts/stores/ui_behavior';
	import Button from './Button.svelte';

	let {} = $props<{}>();
</script>

<div
	class="p-1 {get_selectable_color_classes(false, {
		bg: true,
		hover: true,
		active: true,
		text: true
	})} h-10 rounded-lg transition-colors duration-200 gap-4 flex flex-row justify-between cursor-pointer group"
>
	<div class="flex flex-row gap-2 min-w-0">
		<div class="aspect-square rounded-md flex justify-center items-center">
            <Folder />
        </div>
		<div class="content-center truncate select-none">
			Tolle
			Dateifjisodfhsuidfhdufighdfiughdfuighdfuihguifdghiudfhguidfgdfijghdfjkghdfkjghdfkjghdfkughdfjghdfkjghdfkjghfdkghdfkjghdfkghdfkghdfkjghdfkghdfkjghdfgkhdfkghfdkjghdfkghfdkghdfkjghdfjkghdk.zip
		</div>
	</div>
	<div class="flex flex-row gap-1 pr-1 text-stone-400 group-hover:text-stone-300 group-active:text-stone-250 duration-200 transition-colors">
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
		<div class="content-center select-none text-xs whitespace-nowrap">25.09.25</div>
		<div class="border border-stone-550 group-hover:border-stone-450 group-active:border-stone-400 duration-200 transition-colors my-1"></div>
		<div class="content-center select-none text-xs whitespace-nowrap">MPEG</div>
		<div class="border border-stone-550 group-hover:border-stone-450 group-active:border-stone-400 duration-200 transition-colors my-1"></div>
		<div class="content-center select-none text-xs whitespace-nowrap">523 MB</div>
	</div>
</div>
