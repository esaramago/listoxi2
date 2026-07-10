<script lang="ts">
	import '../app.css'
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { currentUser } from '@/lib/pb'
	import Grid from '@/components/ui/Grid.svelte'

	let { children } = $props();

	let isDarkMode = $state(false);
	let componentsLoaded = $state(false);

	// Safe routing check
	onMount(async () => {
		// Import Web Awesome web components client-side
		try {
			await Promise.all([
				import('@awesome.me/webawesome/dist/components/button/button.js'),
				import('@awesome.me/webawesome/dist/components/input/input.js'),
				import('@awesome.me/webawesome/dist/components/textarea/textarea.js'),
				import('@awesome.me/webawesome/dist/components/card/card.js'),
				import('@awesome.me/webawesome/dist/components/callout/callout.js'),
				import('@awesome.me/webawesome/dist/components/dropdown/dropdown.js'),
				import('@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js')
			]);
			componentsLoaded = true;
		} catch (err) {
			console.error('Failed to load Web Awesome elements:', err);
		}

		// Theme initialization
		const savedTheme = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		
		if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
			isDarkMode = true;
			document.documentElement.classList.add('wa-dark');
		} else {
			isDarkMode = false;
			document.documentElement.classList.remove('wa-dark');
		}
	})

	// Svelte 5 reactive effect for routing auth check
	$effect(() => {
		const user = $currentUser;
		const path = $page.url.pathname;

		if (!user && path !== '/login') {
			goto('/login');
		} else if (user && path === '/login') {
			goto('/');
		}
	});
</script>

<svelte:head>
	<title>Listoxi - Lista de Compras Offline</title>
	<meta name="description" content="Aplicação de lista de compras offline-first com sincronização em tempo real." />
</svelte:head>

{#if componentsLoaded}
	{@render children()}
{:else}
	<Grid class="loading-screen" align="center" justify="center">
		A carregar componentes...
	</Grid>
{/if}

<style>
	:global(.loading-screen) {
		height: 100vh;
		font-family: var(--wa-font-family-body, sans-serif);
		font-size: var(--wa-font-size-l);
		font-weight: 500;
	}
</style>
