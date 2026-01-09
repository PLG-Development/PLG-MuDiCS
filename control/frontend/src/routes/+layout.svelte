<script lang="ts">
	import '../app.css';
	import Notification from './Notification.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>PLG MuDiCS Control</title>
</svelte:head>

{@render children()}

<Notification />
