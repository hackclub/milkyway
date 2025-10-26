<script>
	import { onMount } from 'svelte';

	let { artworkData } = $props();
	let canvasElement;

	onMount(() => {
		let ctx = canvasElement.getContext('2d');
		const img = new Image();
		img.src = artworkData.data;
		img.onload = () => {
			ctx.drawImage(img, 0, 0, canvasElement.width, canvasElement.height);
		};
	});
</script>

<div class="art-viewer">
	<div class="art-container">
		<canvas bind:this={canvasElement} width="400" height="400"></canvas>
	</div>
	<div class="nameplate"><span>{artworkData.name}</span></div>
</div>

<style>
	canvas {
		display: block;
		border-radius: 4px;
	}
	.art-viewer {
		display: flex;
		background-color: #fbf2bf;
		border: 3px solid #f7c881;
		border-radius: 8px;
		flex-direction: column;
		gap: 16px;
		padding: 16px;
		align-items: center;
	}
	.nameplate {
		margin-top: 12px;
		padding: 12px;
		text-align: center;
	}
</style>
