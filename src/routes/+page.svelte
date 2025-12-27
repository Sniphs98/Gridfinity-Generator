<script lang="ts">
	import PictureFrame from './pictureFrame.svelte';
	import { detectEdges, detectA4Sheet } from '$lib/pictureProcessing.svelte';

	let selectedImage = $state<string | null>(null);
	let bwImage = $state<string | null>(null);
	let a4DetectionImage = $state<string | null>(null);
	let fileName = $state<string>('');

	function handleImageSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			fileName = file.name;
			const reader = new FileReader();
			reader.onload = (e) => {
				selectedImage = e.target?.result as string;
				// Reset processed images when new image is selected
				bwImage = null;
				a4DetectionImage = null;
			};
			reader.readAsDataURL(file);
		}
	}

	async function processPicture() {
		bwImage = await detectEdges(selectedImage);
		a4DetectionImage = await detectA4Sheet(selectedImage);
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

	<PictureFrame image={selectedImage} />

	{#if selectedImage}
		<button onclick={processPicture} class="btn-success rounded-lg px-4 py-2 text-white">
			Kantenerkennung
		</button>
	{/if}

	<div class="flex gap-4">
		<PictureFrame image={bwImage} />
		<PictureFrame image={a4DetectionImage} />
	</div>
	{#if bwImage && a4DetectionImage}
		<button onclick={processPicture} class="btn-success rounded-lg px-4 py-2 text-white">
			Größe
		</button>
	{/if}
</div>
