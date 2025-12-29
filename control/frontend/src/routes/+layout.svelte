<script lang="ts">
	import '../app.css';
	import Notification from './Notification.svelte';

	let { children } = $props();
</script>

{@render children()}

<Notification />
