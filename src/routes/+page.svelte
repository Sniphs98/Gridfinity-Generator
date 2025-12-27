<script lang="ts">
	import PictureFrame from './pictureFrame.svelte';
	import {
		detectEdges,
		detectA4Sheet,
		detectObjectOnA4,
		type ObjectMeasurement
	} from '$lib/pictureProcessing.svelte';

	let selectedImage = $state<string | null>(null);
	let bwImage = $state<string | null>(null);
	let a4DetectionImage = $state<string | null>(null);
	let objectMeasurement = $state<ObjectMeasurement | null>(null);
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
				objectMeasurement = null;
			};
			reader.readAsDataURL(file);
		}
	}

	async function processPicture() {
		bwImage = await detectEdges(selectedImage);
		a4DetectionImage = await detectA4Sheet(selectedImage);
	}

	async function measureObject() {
		objectMeasurement = await detectObjectOnA4(selectedImage);
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
		<button onclick={measureObject} class="btn-success rounded-lg px-4 py-2 text-white">
			Objekt vermessen
		</button>
	{/if}

	{#if objectMeasurement}
		<div class="rounded-lg border border-gray-300 p-4">
			<h2 class="mb-4 text-xl font-bold">Objektmessungen</h2>
			<div class="mb-4 grid grid-cols-3 gap-4">
				<div class="rounded-lg bg-blue-100 p-3">
					<p class="text-sm text-gray-600">Breite</p>
					<p class="text-2xl font-bold text-blue-700">{objectMeasurement.widthMm} mm</p>
				</div>
				<div class="rounded-lg bg-green-100 p-3">
					<p class="text-sm text-gray-600">Höhe</p>
					<p class="text-2xl font-bold text-green-700">{objectMeasurement.heightMm} mm</p>
				</div>
				<div class="rounded-lg bg-purple-100 p-3">
					<p class="text-sm text-gray-600">Fläche</p>
					<p class="text-2xl font-bold text-purple-700">{objectMeasurement.areaMm2} mm²</p>
				</div>
			</div>
			<PictureFrame image={objectMeasurement.imageUrl} />

			{#if objectMeasurement.debugImages}
				<details class="mt-4">
					<summary class="cursor-pointer font-bold">Debug-Bilder anzeigen</summary>
					<div class="mt-4 grid grid-cols-2 gap-4">
						<div>
							<h3 class="mb-2 font-semibold">1. Warped (A4 gerade)</h3>
							<PictureFrame image={objectMeasurement.debugImages.warped} />
						</div>
						<div>
							<h3 class="mb-2 font-semibold">2. Equalized (Kontrast)</h3>
							<PictureFrame image={objectMeasurement.debugImages.equalized} />
						</div>
						<div>
							<h3 class="mb-2 font-semibold">3. Threshold</h3>
							<PictureFrame image={objectMeasurement.debugImages.thresh} />
						</div>
						<div>
							<h3 class="mb-2 font-semibold">4. Edges</h3>
							<PictureFrame image={objectMeasurement.debugImages.edges} />
						</div>
						<div>
							<h3 class="mb-2 font-semibold">5. Combined</h3>
							<PictureFrame image={objectMeasurement.debugImages.combined} />
						</div>
						<div>
							<h3 class="mb-2 font-semibold">6. Closed (Final)</h3>
							<PictureFrame image={objectMeasurement.debugImages.closed} />
						</div>
					</div>
				</details>
			{/if}
		</div>
	{/if}
</div>
