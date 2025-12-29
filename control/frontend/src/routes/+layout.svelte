<script lang="ts">
	import '../app.css';
	import Notification from '$lib/components/Notification.svelte';

	let { children } = $props();
</script>

{@render children()}

<Notification />
