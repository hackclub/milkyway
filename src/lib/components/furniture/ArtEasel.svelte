<script>
	import ArtViewer from '$lib/components/furniture/art-easel/ArtViewer.svelte';
	import DrawingBoard from '$lib/components/furniture/art-easel/DrawingBoard.svelte';

	let { data, mode, id } = $props();

	let artworkData = $state(data ? JSON.parse(data) : '');

	async function onSave(newArtworkData) {
		try {
			const response = await fetch('/api/furniture', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					furnitureId: id,
					updates: { data: JSON.stringify(newArtworkData) }
				})
			});

			const result = await response.json();

			if (result.success) {
				artworkData = newArtworkData;
				location.reload();
			} else {
				console.error('Failed to save artwork:', result.error);
				alert('Failed to save artwork. Please try again.');
			}
		} catch (error) {
			console.error('Error saving artwork:', error);
			alert('Error saving artwork. Please try again.');
		}
	}
</script>

<div class="art-easel">
	{#if mode === 'view' && artworkData.data !== ''}
		<ArtViewer {artworkData} />
	{:else if mode === 'edit'}
		<DrawingBoard {artworkData} saveArtwork={onSave} />
	{:else}
		<span class="placeholder-text">No artwork to display.</span>
	{/if}
</div>

<style>
	.art-easel {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		position: absolute;
	}

	.placeholder-text {
		background-color: #fbf2bf;
		border: 3px solid #f7c881;
		border-radius: 8px;
		padding: 16px;
		font-size: 1.2rem;
		color: #888;
		white-space: nowrap;
	}
</style>
