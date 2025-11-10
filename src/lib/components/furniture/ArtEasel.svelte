<script>
	import ArtViewer from '$lib/components/furniture/art-easel/ArtViewer.svelte';
	import DrawingBoard from '$lib/components/furniture/art-easel/DrawingBoard.svelte';
	import { onMount } from 'svelte';

	let { data, mode, id } = $props();

	let artworkData = $state(data ? JSON.parse(data) : '');

	async function onSave(newArtworkData) {
		try {
			await fetch('/api/upload-canvas-image', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ id: id, imageData: newArtworkData.data })
			});
			location.reload();
		} catch (error) {
			console.error('Error saving artwork:', error);
			alert('Error saving artwork. Please try again.');
		}
	}

	onMount(() => {
		fetch(artworkData.url).catch(() => {
			fetch('/api/get-canvas-image', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ id: id })
			})
				.then((response) => response.json())
				.then((data) => {
					artworkData.url = data.url;
				})
				.catch((err) => {
					console.error('Error fetching artwork data:', err);
				});
		});
	});
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
		font-family: 'Futura', sans-serif;
		border-radius: 8px;
		padding: 16px;
		font-size: 1.2rem;
		color: #888;
		white-space: nowrap;
	}
</style>
