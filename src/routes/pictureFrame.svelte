<script lang="ts">
	let { image } = $props<{ image: string | null }>();
</script>

<div class="space-y-2">
	<p class="text-muted text-sm">Ausgewähltes Bild</p>
	<img src={image} alt="Foto" class="border-default max-w-64 rounded-lg border" />
</div>

