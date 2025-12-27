<script lang="ts">
	let selectedImage = $state<string | null>(null);
	let fileName = $state<string>('');

	function handleImageSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			fileName = file.name;
			const reader = new FileReader();
			reader.onload = (e) => {
				selectedImage = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		}
	}
</script>

<h1>Gridfinity Generator</h1>

<div class="space-y-4">
	<input
		type="file"
		id="camera"
		accept="image/*"
		capture="environment"
		class="hidden"
		onchange={handleImageSelect}
	/>
	<label
		for="camera"
		class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-600"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			class="h-5 w-5"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
			/>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
			/>
		</svg>
		Foto mit Rückkamera aufnehmen
	</label>

	{#if selectedImage}
		<div class="space-y-2">
			<p class="text-sm text-gray-600 dark:text-gray-400">Ausgewähltes Bild: {fileName}</p>
			<img
				src={selectedImage}
				alt="Ausgewähltes Foto"
				class="max-w-full rounded-lg border border-gray-300 dark:border-gray-700"
			/>
		</div>
	{/if}
</div>