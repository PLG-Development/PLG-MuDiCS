<script lang="ts">
	import '../app.css';
	import Notification from './Notification.svelte';
	import SplashScreen from './../../../../shared/splash_screen.html?raw';
	import version_txt from './../../../../shared/version.txt?raw';
	import { dev } from '$app/environment';
	import { onMount } from 'svelte';

	let { children } = $props();
	
	let CompletedSplashScreen = SplashScreen.replaceAll("%%APP-VERSION%%", version_txt.trim());
</script>

<svelte:head>
	<title>PLG MuDiCS Control</title>
</svelte:head>

{#if !dev}
	{@html SplashScreen}
{/if}

{@render children()}

<Notification />
