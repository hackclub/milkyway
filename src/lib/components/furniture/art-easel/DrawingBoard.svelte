<script>
	import { onMount } from 'svelte';

	const { artworkData, saveArtwork } = $props();

	let canvas;
	let ctx;
	let isDrawing = $state(false);
	let particles = $state([]);
	let lastX = $state(0);
	let lastY = $state(0);

	let isLoading = $state(false);

	let currentBrush = $state('simple');
	let brushSize = $state(10);
	let currentColor = $state('#754668');

	let canvasWidth = $state(800);
	let canvasHeight = $state(600);
	let containerWidth = $state(0);

	const brushes = [
		{ type: 'simple', icon: '✏️', name: 'Pencil' },
		{ type: 'sparkle', icon: '✨', name: 'Sparkles' },
		{ type: 'confetti', icon: '🎊', name: 'Confetti' },
		{ type: 'rainbow', icon: '🌈', name: 'Rainbow Trail' },
		{ type: 'bubble', icon: '🫧', name: 'Bubbles' },
		{ type: 'spray', icon: '💦', name: 'Spray Paint' },
		{ type: 'neon', icon: '⚡', name: 'Neon' }
	];

	onMount(() => {
		updateCanvasSize();
		window.addEventListener('resize', updateCanvasSize);

		ctx = canvas.getContext('2d');
		if (artworkData) {
			const img = new Image();
			img.onload = () => ctx.drawImage(img, 0, 0);
			img.src = artworkData.url;
		}
		animateParticles();

		return () => {
			window.removeEventListener('resize', updateCanvasSize);
		};
	});

	function updateCanvasSize() {
		if (!canvas) return;

		const container = canvas.parentElement;
		if (!container) return;

		const maxWidth = Math.min(container.clientWidth - 32, window.innerWidth - 32);
		const aspectRatio = 4 / 3;

		canvasWidth = Math.max(300, Math.min(800, maxWidth));
		canvasHeight = Math.round(canvasWidth / aspectRatio);
		containerWidth = maxWidth;

		canvas.width = canvasWidth;
		canvas.height = canvasHeight;
	}

	function startDrawing(e) {
		isDrawing = true;
		const rect = canvas.getBoundingClientRect();
		lastX = e.clientX - rect.left;
		lastY = e.clientY - rect.top;
		draw(e);
	}

	function stopDrawing() {
		isDrawing = false;
	}

	function draw(e) {
		if (!isDrawing) return;

		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		switch (currentBrush) {
			case 'simple':
				drawSimple(x, y);
				break;
			case 'sparkle':
				drawSparkle(x, y);
				break;
			case 'confetti':
				drawConfetti(x, y);
				break;
			case 'rainbow':
				drawRainbow(x, y);
				break;
			case 'bubble':
				drawBubble(x, y);
				break;
			case 'spray':
				drawSpray(x, y);
				break;
			case 'neon':
				drawNeon(x, y);
				break;
		}

		lastX = x;
		lastY = y;
	}

	function drawSimple(x, y) {
		ctx.strokeStyle = currentColor;
		ctx.lineWidth = brushSize;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		ctx.beginPath();
		ctx.moveTo(lastX, lastY);
		ctx.lineTo(x, y);
		ctx.stroke();
	}

	function drawSparkle(x, y) {
		ctx.fillStyle = currentColor;
		ctx.shadowColor = currentColor;
		ctx.beginPath();
		const spikes = 5;
		const outerRadius = brushSize;
		const innerRadius = brushSize / 2;
		for (let i = 0; i < spikes * 2; i++) {
			const angle = (i * Math.PI) / spikes;
			const radius = i % 2 === 0 ? outerRadius : innerRadius;
			const px = x + Math.cos(angle) * radius;
			const py = y + Math.sin(angle) * radius;
			if (i === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.closePath();
		ctx.fill();
	}

	function drawConfetti(x, y) {
		const colors = ['#FF6B9D', '#C44569', '#F8B500', '#4ECDC4', '#95E1D3', '#F38181'];
		for (let i = 0; i < 8; i++) {
			particles.push({
				x,
				y,
				vx: (Math.random() - 0.5) * 8,
				vy: Math.random() * -5 - 2,
				life: 60,
				color: colors[Math.floor(Math.random() * colors.length)]
			});
		}
	}

	function drawRainbow(x, y) {
		const colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];
		colors.forEach((color) => {
			ctx.fillStyle = color;
			ctx.globalAlpha = 0.6;
			ctx.beginPath();
			ctx.arc(
				x + (Math.random() - 0.5) * 20,
				y + (Math.random() - 0.5) * 20,
				brushSize / 2,
				0,
				Math.PI * 2
			);
			ctx.fill();
		});
		ctx.globalAlpha = 1;
	}

	function drawBubble(x, y) {
		ctx.strokeStyle = currentColor;
		ctx.lineWidth = 3;
		ctx.globalAlpha = 0.4;
		ctx.beginPath();
		ctx.arc(x, y, brushSize, 0, Math.PI * 2);
		ctx.stroke();

		ctx.fillStyle = 'white';
		ctx.globalAlpha = 0.6;
		ctx.beginPath();
		ctx.arc(x - brushSize / 3, y - brushSize / 3, brushSize / 4, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1;
	}

	function drawSpray(x, y) {
		for (let i = 0; i < 15; i++) {
			const offsetX = (Math.random() - 0.5) * brushSize * 2;
			const offsetY = (Math.random() - 0.5) * brushSize * 2;
			ctx.fillStyle = currentColor;
			ctx.globalAlpha = Math.random() * 0.8;
			ctx.beginPath();
			ctx.arc(x + offsetX, y + offsetY, 1, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}

	function drawNeon(x, y) {
		ctx.strokeStyle = currentColor;
		ctx.lineWidth = brushSize;
		ctx.shadowBlur = 20;
		ctx.shadowColor = currentColor;
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(lastX, lastY);
		ctx.lineTo(x, y);
		ctx.stroke();
		ctx.shadowBlur = 0;
	}

	function animateParticles() {
		requestAnimationFrame(animateParticles);

		particles = particles.filter((p) => {
			p.x += p.vx;
			p.y += p.vy;
			p.vy += 0.3;
			p.life--;

			if (p.life > 0) {
				ctx.fillStyle = p.color;
				ctx.globalAlpha = p.life / 60;
				ctx.fillRect(p.x, p.y, 4, 8);
				ctx.globalAlpha = 1;
				return true;
			}
			return false;
		});
	}

	let showClearConfirm = $state(false);

	function confirmClear() {
		showClearConfirm = true;
	}

	function clearCanvas() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		showClearConfirm = false;
	}
</script>

<div class="editor">
	<div class="canvas-container">
		<canvas
			bind:this={canvas}
			width={800}
			height={600}
			onmousedown={startDrawing}
			onmousemove={draw}
			onmouseup={stopDrawing}
			onmouseleave={stopDrawing}
		></canvas>
	</div>

	<div class="toolbar">
		<div class="brush-selector">
			{#each brushes as brush (brush.type)}
				<button
					class="brush-btn"
					class:selected={currentBrush === brush.type}
					onclick={() => (currentBrush = brush.type)}
					title={brush.name}
				>
					<span class="brush-icon">{brush.icon}</span>
				</button>
			{/each}
		</div>

		<div class="controls">
			<div class="control-group">
				<label>Color:</label>
				<input type="color" bind:value={currentColor} class="color-picker" />
			</div>

			<div class="control-group">
				<label>Size:</label>
				<input type="range" min="2" max="30" bind:value={brushSize} class="size-slider" />
				<span class="size-value">{brushSize}</span>
			</div>

			<button class="action-btn clear-btn" onclick={confirmClear}>Clear</button>
			<button
				class="action-btn save-btn"
				disabled={isLoading}
				onclick={async () => {
					isLoading = true;
					const dataUrl = canvas.toDataURL();
					await saveArtwork({ ...artworkData, data: dataUrl });
				}}>Save</button
			>
		</div>
	</div>
</div>

{#if showClearConfirm}
	<div class="popup-overlay" onclick={() => (showClearConfirm = false)}>
		<div class="popup-content" onclick={(e) => e.stopPropagation()}>
			<h3>Clear Canvas?</h3>
			<p>Are you sure you want to clear your artwork? This cannot be undone!</p>
			<div class="popup-buttons">
				<button class="action-btn cancel-btn" onclick={() => (showClearConfirm = false)}>
					Cancel
				</button>
				<button class="action-btn confirm-btn" onclick={clearCanvas}>Yes</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.editor {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 16px;
	}

	.canvas-container {
		background: #fbf2bf;
		border: 4px solid #f7c881;
		border-radius: 8px;
		padding: 16px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	canvas {
		display: block;
		border: 2px solid #f7c881;
		border-radius: 4px;
		cursor: crosshair;
		background: white;
	}

	.toolbar {
		display: flex;
		gap: 16px;
		flex-direction: column;
		background-color: #fbf2bf;
		border: 4px solid #f7c881;
		border-radius: 8px;
		padding: 16px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.brush-selector {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.brush-btn {
		width: 50px;
		height: 50px;
		border: 3px solid transparent;
		border-radius: 8px;
		background: white;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.brush-btn:hover {
		transform: scale(1.05);
		border-color: #f7c881;
	}

	.brush-btn.selected {
		border-color: var(--orange, #ff8c42);
		filter: drop-shadow(-3px -3px 0 var(--orange, #ff8c42))
			drop-shadow(3px -3px 0 var(--orange, #ff8c42)) drop-shadow(-3px 3px 0 var(--orange, #ff8c42))
			drop-shadow(3px 3px 0 var(--orange, #ff8c42));
	}

	.brush-icon {
		pointer-events: none;
	}

	.controls {
		display: flex;
		gap: 16px;
		align-items: center;
		flex-wrap: wrap;
		justify-content: center;
	}

	.control-group {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.control-group label {
		font-weight: bold;
		color: #333;
	}

	.color-picker {
		width: 60px;
		height: 40px;
		border: 3px solid #f7c881;
		border-radius: 8px;
		cursor: pointer;
		background: white;
	}

	.size-slider {
		width: 120px;
	}

	.size-value {
		min-width: 30px;
		font-weight: bold;
		color: #333;
	}

	.action-btn {
		padding: 12px 24px;
		border: 3px solid #f7c881;
		border-radius: 8px;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.2s;
		background: white;
		font-size: 1rem;
	}

	.action-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}

	.clear-btn {
		background: #ff6b6b;
		color: white;
		border-color: #cc5555;
	}

	.save-btn {
		background: #51cf66;
		color: white;
		border-color: #40a653;
	}

	.save-btn:disabled {
		background: #a5d6a7;
		border-color: #81c784;
		cursor: not-allowed;
		box-shadow: none;
		transform: none;
	}

	.popup-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.popup-content {
		background-color: #fbf2bf;
		border: 4px solid #f7c881;
		border-radius: 8px;
		padding: 32px;
		position: relative;
		text-align: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		max-width: 400px;
	}

	.popup-content h3 {
		margin: 0 0 16px 0;
		color: #333;
	}

	.popup-content p {
		margin: 0 0 24px 0;
		color: #666;
	}

	.popup-buttons {
		display: flex;
		gap: 12px;
		justify-content: center;
	}

	.cancel-btn {
		background: #ccc;
		color: #333;
		border-color: #999;
	}

	.confirm-btn {
		background: #ff6b6b;
		color: white;
		border-color: #cc5555;
	}

	@media (max-width: 600px) {
		.editor {
			padding: 8px;
		}

		.canvas-container {
			padding: 8px;
		}

		.toolbar {
			padding: 8px;
		}

		.brush-btn {
			width: 40px;
			height: 40px;
			font-size: 1.2rem;
		}

		.color-picker {
			width: 50px;
			height: 35px;
		}

		.size-slider {
			width: 100px;
		}

		.action-btn {
			padding: 10px 20px;
			font-size: 0.9rem;
		}

		.popup-content {
			padding: 24px;
		}
	}
</style>
