<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="min-h-screen">
	<header class="border-b border-gray-200 dark:border-gray-700">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
			<h1 class="text-xl font-bold">Gridfinity Generator</h1>
			<ThemeToggle />
		</div>
	</header>
	<main class="mx-auto max-w-7xl px-4 py-8">
		{@render children()}
	</main>
</div>
