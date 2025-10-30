<script>
	import { onMount } from 'svelte';

	let { terminalData } = $props();
	let iframeElement;

	onMount(() => {
		iframeElement.src = terminalData.gameUrl;
		try {
			new URL(terminalData.gameUrl);
		} catch {
			iframeElement.srcdoc = terminalData.gameUrl;
			iframeElement.src = '';
		}
	});
</script>

<div class="game-viewer">
	<div class="controls">
		<button
			onclick={() => {
				iframeElement.requestFullscreen();
			}}
			class="fullscreen-control">⛶</button
		>
	</div>
	<div class="game-container">
		<iframe
			bind:this={iframeElement}
			title="Game Frame"
			width="1200"
			height="800"
			sandbox="allow-scripts allow-same-origin"
			class="game-frame"
		></iframe>
	</div>
</div>

<style>
	iframe {
		display: block;
		border-radius: 4px;
	}
	.game-viewer {
		display: flex;
		background-color: #fbf2bf;
		border: 3px solid #f7c881;
		border-radius: 8px;
		flex-direction: column;
		gap: 16px;
		padding: 16px;
		align-items: center;
	}
	.game-container {
		position: relative;
		width: 600px;
		height: 400px;
		overflow: hidden;
	}
	.game-frame {
		border: none;
		width: 1200px;
		height: 800px;
		transform: scale(0.5);
		transform-origin: top left;
	}
	.controls {
		flex: auto;
		flex-direction: row;
		width: 100%;
		display: flex;
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 16px;
	}
	.fullscreen-control {
		background: rgba(255, 255, 255, 0.7);
		border: none;
		border-radius: 4px;
		font-size: 16px;
	}
</style>
