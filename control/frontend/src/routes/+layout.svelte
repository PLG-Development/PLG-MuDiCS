<script lang="ts">
	import '../app.css';
	import Notification from './Notification.svelte';
	import SplashScreen from './../../../../shared/splash_screen.html?raw';
	import { dev } from '$app/environment';

	let { children } = $props();
</script>

<svelte:head>
	<title>PLG MuDiCS Control</title>
</svelte:head>

{#if !dev}
	{@html SplashScreen}
{/if}

{@render children()}

<Notification />
