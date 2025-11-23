<script lang="ts">
	let {
		children,
		bg = 'bg-stone-750',
		fg = 'text-stone-200',
		className = ''
	} = $props<{ children: any; bg?: string; fg?: string; className?: string }>();
</script>

<div class="{bg} {fg} {className} rounded-lg py-0.5 px-1 inline-block truncate min-w-0 max-w-full align-middle my-[1.5px]">
	{@render children()}
</div>
