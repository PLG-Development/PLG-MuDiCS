<script lang="ts">
	import { display_status_to_info, type DisplayStatus } from "../ts/types";

	let { selected, status, className = "" } = $props<{
		selected: boolean;
		status: DisplayStatus;
        className?: string;
	}>();

	function get_text_color(selected: boolean, status: DisplayStatus) {
		switch (status) {
			case 'app_online':
				return selected ? 'text-green-700' : 'text-green-400';
			case 'app_offline':
				return selected ? 'text-amber-700' : 'text-amber-400';
			case 'host_offline':
				return selected ? 'text-red-700' : 'text-red-400';
			default:
				return selected ? 'text-stone-700' : 'text-stone-400';
		}
	}
</script>

<div class="{get_text_color(selected, status)} {className} transition-colors duration-100">
	{display_status_to_info(status)}
</div>
