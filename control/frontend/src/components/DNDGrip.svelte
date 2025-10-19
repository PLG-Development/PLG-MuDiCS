<script lang="ts">
	import { GripHorizontal } from 'lucide-svelte';
	import { dragHandle } from 'svelte-dnd-action';

	let { bg, className = "" } = $props<{
		bg: string;
        className?: string;
	}>();
</script>

<div
	use:dragHandle
	class="{className} bg-transparent hover:{bg} active:{bg} p-2 rounded-xl duration-200 transition-colors"
>
	<GripHorizontal />
</div>
