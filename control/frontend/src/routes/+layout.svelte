<script lang="ts">
	import '../app.css';
	import Notification from './Notification.svelte';
	import SplashScreen from './../../../../shared/splash_screen.html?raw';
	import version from './../../../../shared/version.txt?raw';
	import { dev } from '$app/environment';

	let { children } = $props();

	let versionSplashScreen = SplashScreen.replaceAll('%%APP-VERSION%%', version.trim());
</script>

<svelte:head>
	<title>PLG MuDiCS Control</title>
</svelte:head>

{#if !dev}
	{@html versionSplashScreen}
{/if}

{@render children()}

<Notification />

<style>
	:root {
		--splash-fade-out-delay: 3.5s !important;
	}
</style>
