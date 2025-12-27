<script lang="ts">
	import PictureFrame from './pictureFrame.svelte';
	import { detectEdges } from '$lib/pictureProcessing.svelte';

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

    function generator(){
        detectEdges(selectedImage);
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
		class="btn-primary inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-white"
	>
		Foto mit Rückkamera aufnehmen
	</label>

	{#if selectedImage}
		<PictureFrame image={selectedImage} />
		<button onclick={generator} class="btn-success mt-4 rounded-lg px-4 py-2 text-white">
			Generieren
		</button>
	{/if}

</div>