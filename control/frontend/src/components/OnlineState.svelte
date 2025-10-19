<script lang="ts">
	let { selected, status, className = "" } = $props<{
		selected: boolean;
		status: string;
        className?: string;
	}>();

	function get_text_color(selected: boolean, status: string) {
		switch (status) {
			case 'Online':
				return selected ? 'text-green-700' : 'text-green-400';
			case 'Lädt':
				return selected ? 'text-amber-700' : 'text-amber-400';
			case 'Offline':
				return selected ? 'text-red-700' : 'text-red-400';
			default:
				return selected ? 'text-stone-700' : 'text-stone-400';
		}
	}
</script>

<div class="{get_text_color(selected, status)} {className} transition-colors duration-100">
	{status}
</div>
