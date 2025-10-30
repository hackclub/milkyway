<script>
	let { bulletinBoardData } = $props();

	const components = bulletinBoardData?.components || [];
	let canvasWrapperElement;
	let canvasScale = $state(1);

	const CANVAS_WIDTH = 1000;
	const CANVAS_HEIGHT = 700;

	$effect(() => {
		if (canvasWrapperElement) {
			const updateScale = () => {
				const wrapperRect = canvasWrapperElement.getBoundingClientRect();
				const padding = 64;
				const availableWidth = wrapperRect.width - padding;
				const availableHeight = wrapperRect.height - padding;

				const scaleX = availableWidth / CANVAS_WIDTH;
				const scaleY = availableHeight / CANVAS_HEIGHT;

				canvasScale = Math.min(scaleX, scaleY, 1);
			};

			updateScale();

			const resizeObserver = new ResizeObserver(updateScale);
			resizeObserver.observe(canvasWrapperElement);

			return () => resizeObserver.disconnect();
		}
	});
</script>

<div class="bulletin-board-view" bind:this={canvasWrapperElement}>
	<div
		class="canvas"
		style="width: {CANVAS_WIDTH}px; height: {CANVAS_HEIGHT}px; transform: scale({canvasScale}); transform-origin: center;"
	>
		{#each components as component (component.id)}
			<div
				class="component {component.type}"
				style="left: {component.x}px; top: {component.y}px; width: {component.width}px; height: {component.height}px;"
			>
				{#if component.type === 'text'}
					<div
						class="text-content"
						style="font-size: {component.fontSize || 16}px; color: {component.color ||
							'#000'}; font-family: {component.fontFamily || `'Futura', sans-serif`};"
					>
						{component.content}
					</div>
				{:else if component.type === 'link'}
					<a href={component.url} target="_blank" rel="noopener noreferrer" class="link-content">
						<span class="link-icon">🔗</span>
						<span class="link-text">{component.label || component.url}</span>
					</a>
				{:else if component.type === 'image'}
					<img
						src={component.url}
						alt={component.alt || 'Bulletin board image'}
						class="image-content"
					/>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.bulletin-board-view {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: hidden;
	}

	.canvas {
		position: relative;
		background-color: #fbf2bf;
		border: 3px solid #f7c881;
		border-radius: 8px;
		flex-shrink: 0;
	}

	.component {
		position: absolute;
		cursor: default;
		border-radius: 4px;
		overflow: hidden;
	}

	.text-content {
		padding: 8px;
		white-space: pre-wrap;
		word-wrap: break-word;
		height: 100%;
		overflow: auto;
	}

	.link-content {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px;
		background-color: #4a90e2;
		color: white;
		text-decoration: none;
		border-radius: 4px;
		font-weight: 500;
		height: 100%;
		transition: background-color 0.2s;
	}

	.link-content:hover {
		background-color: #357abd;
	}

	.link-icon {
		font-size: 20px;
	}

	.link-text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.image-content {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border: 2px solid #f7c881;
		border-radius: 4px;
	}
</style>
