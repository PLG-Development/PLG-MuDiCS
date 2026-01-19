<script lang="ts">
	import type { NumberSetting } from '$lib/ts/types';
	import { ChevronDown, ChevronUp, Minus, Plus } from 'lucide-svelte';
	import Button from './Button.svelte';

	let {
		number_setting,
		on_change,
		className = '',
        disabled = false,
	}: {
		number_setting: NumberSetting;
		on_change: (new_value: number) => void;
		className?: string;
        disabled?: boolean;
	} = $props();

	let el: HTMLInputElement | null = null;

	function increase() {
        if (!el) return;
		el.stepUp();
		el.dispatchEvent(new Event('input', { bubbles: true }));
		on_change(Number(el.value));
	}

	function decrease() {
        if (!el) return;
		el.stepDown();
		el.dispatchEvent(new Event('input', { bubbles: true }));
        on_change(Number(el.value));
	}

    function on_blur() {
        if (!el) return;
        let value = Number(el.value);
        if (value > number_setting.max) value = number_setting.max;
        else if (value < number_setting.min) value = number_setting.min;
        el.value = String(value);
        on_change(value);
    }
</script>

<div class="flex flex-row {className}">
	<Button click_function={increase} className="rounded-r-none" disabled={disabled}>
        <ChevronUp />
    </Button>
	<input
        bind:this={el}
		class="bg-stone-700 focus:bg-stone-550 focus:outline-none transition-colors duration-200 py-2 px-4 w-15 text-center
        {disabled ? 'text-stone-500 cursor-not-allowed' : 'hover:bg-stone-600'}
        [appearance:textfield]
        [&::-webkit-outer-spin-button]:appearance-none
        [&::-webkit-inner-spin-button]:appearance-none"
		type="number"
        disabled={disabled}
		max={number_setting.max}
		min={number_setting.min}
		value={number_setting.now}
		step={number_setting.step}
        onblur={on_blur}
	/>
    <Button click_function={decrease} className="rounded-l-none" disabled={disabled}>
        <ChevronDown />
    </Button>
</div>
