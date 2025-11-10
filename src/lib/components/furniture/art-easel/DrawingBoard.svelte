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

	// Undo/Redo state
	let history = $state([]);
	let historyStep = $state(-1);
	let isDrawingStroke = $state(false);

	const brushes = [
		{ type: 'simple', icon: '✏️', name: 'Pencil' },
		{ type: 'eraser', icon: '🧹', name: 'Eraser' },
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
			img.onload = () => {
				ctx.drawImage(img, 0, 0);
				saveToHistory();
			};
			img.crossOrigin = 'anonymous';
			img.src = artworkData.url;
		} else {
			saveToHistory();
		}
		animateParticles();

		return () => {
			window.removeEventListener('resize', updateCanvasSize);
		};
	});

	function hexToRgb(hex) {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result
			? {
					r: parseInt(result[1], 16),
					g: parseInt(result[2], 16),
					b: parseInt(result[3], 16)
				}
			: { r: 117, g: 70, b: 104 };
	}

	function rgbToHex(r, g, b) {
		return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
	}

	function getLighterColor(hex, factor = 0.3) {
		const rgb = hexToRgb(hex);
		const lighter = {
			r: Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor)),
			g: Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor)),
			b: Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor))
		};
		return rgbToHex(lighter.r, lighter.g, lighter.b);
	}

	function getDarkerColor(hex, factor = 0.3) {
		const rgb = hexToRgb(hex);
		const darker = {
			r: Math.round(rgb.r * (1 - factor)),
			g: Math.round(rgb.g * (1 - factor)),
			b: Math.round(rgb.b * (1 - factor))
		};
		return rgbToHex(darker.r, darker.g, darker.b);
	}

	function getComplementaryColor(hex) {
		const rgb = hexToRgb(hex);
		return rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
	}

	function updateCanvasSize() {
		if (!canvas) return;

		const container = canvas.parentElement;
		if (!container) return;

		const maxWidth = Math.min(container.clientWidth - 32, window.innerWidth - 32);
		const aspectRatio = 4 / 3;

		canvasWidth = Math.max(300, Math.min(800, maxWidth));
		canvasHeight = Math.round(canvasWidth / aspectRatio);

		canvas.width = canvasWidth;
		canvas.height = canvasHeight;
	}

	function startDrawing(e) {
		isDrawing = true;
		isDrawingStroke = true;
		const rect = canvas.getBoundingClientRect();
		lastX = e.clientX - rect.left;
		lastY = e.clientY - rect.top;
		draw(e);
	}

	function stopDrawing() {
		if (isDrawing && isDrawingStroke) {
			saveToHistory();
			isDrawingStroke = false;
		}
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
			case 'eraser':
				drawEraser(x, y);
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
		const dx = x - lastX;
		const dy = y - lastY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		ctx.strokeStyle = currentColor;
		ctx.lineWidth = brushSize;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		ctx.beginPath();
		ctx.moveTo(lastX, lastY);
		ctx.lineTo(x, y);
		ctx.stroke();

		const steps = Math.max(1, Math.floor(distance / 2));
		for (let i = 0; i < steps; i++) {
			const t = i / steps;
			const px = lastX + dx * t;
			const py = lastY + dy * t;

			const offsetX = (Math.random() - 0.5) * brushSize * 0.3;
			const offsetY = (Math.random() - 0.5) * brushSize * 0.3;

			ctx.fillStyle = currentColor;
			ctx.globalAlpha = Math.random() * 0.3 + 0.1;
			ctx.beginPath();
			ctx.arc(px + offsetX, py + offsetY, Math.random() * 0.5, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}

	function drawEraser(x, y) {
		ctx.globalCompositeOperation = 'destination-out';
		ctx.lineWidth = brushSize;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.globalAlpha = 1;

		ctx.beginPath();
		ctx.moveTo(lastX, lastY);
		ctx.lineTo(x, y);
		ctx.stroke();

		ctx.globalAlpha = 0.2;
		ctx.lineWidth = brushSize * 1.1;
		ctx.beginPath();
		ctx.moveTo(lastX, lastY);
		ctx.lineTo(x, y);
		ctx.stroke();

		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
	}

	function drawSparkle(x, y) {
		const numSparkles = Math.random() > 0.5 ? 2 : 1;

		for (let s = 0; s < numSparkles; s++) {
			const offsetX = (Math.random() - 0.5) * brushSize;
			const offsetY = (Math.random() - 0.5) * brushSize;
			const sparkleX = x + offsetX;
			const sparkleY = y + offsetY;
			const rotation = Math.random() * Math.PI * 2;
			const size = (Math.random() * 0.5 + 0.5) * brushSize * 0.8;

			ctx.shadowBlur = 15;
			ctx.shadowColor = currentColor;
			ctx.fillStyle = currentColor;
			ctx.globalAlpha = 0.3;

			ctx.beginPath();
			const spikes = 8;
			for (let i = 0; i < spikes * 2; i++) {
				const angle = (i * Math.PI) / spikes + rotation;
				const radius = i % 2 === 0 ? size : size / 3;
				const px = sparkleX + Math.cos(angle) * radius;
				const py = sparkleY + Math.sin(angle) * radius;
				if (i === 0) ctx.moveTo(px, py);
				else ctx.lineTo(px, py);
			}
			ctx.closePath();
			ctx.fill();

			ctx.globalAlpha = 0.9;
			ctx.shadowBlur = 8;
			ctx.beginPath();
			for (let i = 0; i < spikes * 2; i++) {
				const angle = (i * Math.PI) / spikes + rotation;
				const radius = i % 2 === 0 ? size * 0.6 : size / 4;
				const px = sparkleX + Math.cos(angle) * radius;
				const py = sparkleY + Math.sin(angle) * radius;
				if (i === 0) ctx.moveTo(px, py);
				else ctx.lineTo(px, py);
			}
			ctx.closePath();
			ctx.fill();

			ctx.fillStyle = getLighterColor(currentColor, 0.7);
			ctx.globalAlpha = 0.8;
			ctx.shadowBlur = 5;
			ctx.shadowColor = getLighterColor(currentColor, 0.7);
			ctx.beginPath();
			ctx.arc(sparkleX, sparkleY, size * 0.15, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.globalAlpha = 1;
		ctx.shadowBlur = 0;
	}

	function drawConfetti(x, y) {
		const baseColor = currentColor;
		const lighterColor = getLighterColor(baseColor, 0.4);
		const lighterColor2 = getLighterColor(baseColor, 0.7);
		const complementaryColor = getComplementaryColor(baseColor);
		const lightComplementary = getLighterColor(complementaryColor, 0.4);

		const vibrantLight = getLighterColor(baseColor, 0.85);
		const vibrantComplementary = getLighterColor(complementaryColor, 0.7);

		const colors = [
			vibrantLight,
			lighterColor2,
			lighterColor,
			vibrantComplementary,
			lightComplementary,
			complementaryColor,
			baseColor,
			getLighterColor(baseColor, 0.2)
		];
		const shapes = ['rect', 'circle', 'triangle', 'star', 'diamond'];

		const numPieces = Math.floor(brushSize / 3) + 3;
		for (let i = 0; i < numPieces; i++) {
			const offsetX = (Math.random() - 0.5) * brushSize * 1.5;
			const offsetY = (Math.random() - 0.5) * brushSize * 1.5;
			const pieceX = x + offsetX;
			const pieceY = y + offsetY;
			const color = colors[Math.floor(Math.random() * colors.length)];
			const shape = shapes[Math.floor(Math.random() * shapes.length)];
			const size = Math.random() * brushSize * 0.4 + brushSize * 0.2;
			const rotation = Math.random() * Math.PI * 2;

			ctx.save();
			ctx.translate(pieceX, pieceY);
			ctx.rotate(rotation);
			ctx.fillStyle = color;
			ctx.globalAlpha = 0.85;

			ctx.shadowColor = color;
			ctx.shadowBlur = 12;
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;

			ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
			ctx.shadowBlur = 3;
			ctx.shadowOffsetX = 1;
			ctx.shadowOffsetY = 1;

			switch (shape) {
				case 'circle':
					ctx.beginPath();
					ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
					ctx.fill();
					break;
				case 'rect':
					ctx.fillRect(-size / 2, -size / 2, size, size * 1.5);
					break;
				case 'triangle':
					ctx.beginPath();
					ctx.moveTo(0, -size / 2);
					ctx.lineTo(size / 2, size / 2);
					ctx.lineTo(-size / 2, size / 2);
					ctx.closePath();
					ctx.fill();
					break;
				case 'diamond':
					ctx.beginPath();
					ctx.moveTo(0, -size / 2);
					ctx.lineTo(size / 2, 0);
					ctx.lineTo(0, size / 2);
					ctx.lineTo(-size / 2, 0);
					ctx.closePath();
					ctx.fill();
					break;
				case 'star':
					ctx.beginPath();
					for (let j = 0; j < 10; j++) {
						const radius = j % 2 === 0 ? size / 2 : size / 4;
						const angle = (j * Math.PI) / 5;
						const px = Math.cos(angle) * radius;
						const py = Math.sin(angle) * radius;
						if (j === 0) ctx.moveTo(px, py);
						else ctx.lineTo(px, py);
					}
					ctx.closePath();
					ctx.fill();
					break;
			}

			// highlight
			ctx.globalAlpha = 0.5;
			ctx.shadowBlur = 8;
			ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
			ctx.fillStyle = getLighterColor(color, 0.7);
			ctx.beginPath();
			ctx.arc(-size * 0.15, -size * 0.15, size * 0.2, 0, Math.PI * 2);
			ctx.fill();

			ctx.restore();
		}

		ctx.globalAlpha = 1;
		ctx.shadowBlur = 0;
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
	}

	function drawRainbow(x, y) {
		const baseColor = currentColor;
		const colors = [
			getDarkerColor(baseColor, 0.5),
			getDarkerColor(baseColor, 0.3),
			baseColor,
			getLighterColor(baseColor, 0.2),
			getLighterColor(baseColor, 0.4),
			getLighterColor(baseColor, 0.6),
			getLighterColor(baseColor, 0.8)
		];
		const dx = x - lastX;
		const dy = y - lastY;
		const angle = Math.atan2(dy, dx);

		// multiple layers
		for (let layer = 0; layer < 2; layer++) {
			colors.forEach((color, index) => {
				const offset = (index - colors.length / 2) * (brushSize / colors.length);
				const perpAngle = angle + Math.PI / 2;
				const offsetX = Math.cos(perpAngle) * offset;
				const offsetY = Math.sin(perpAngle) * offset;

				ctx.strokeStyle = color;
				ctx.lineWidth = (brushSize / colors.length) * (layer === 0 ? 1.5 : 1);
				ctx.globalAlpha = layer === 0 ? 0.4 : 0.7;
				ctx.lineCap = 'round';
				ctx.shadowBlur = 8;
				ctx.shadowColor = color;

				ctx.beginPath();
				ctx.moveTo(lastX + offsetX, lastY + offsetY);
				ctx.lineTo(x + offsetX, y + offsetY);
				ctx.stroke();
			});
		}

		// sparkles
		if (Math.random() > 0.7) {
			ctx.fillStyle = getLighterColor(currentColor, 0.8);
			ctx.globalAlpha = 0.9;
			ctx.shadowBlur = 10;
			ctx.shadowColor = getLighterColor(currentColor, 0.8);
			ctx.beginPath();
			ctx.arc(
				x + (Math.random() - 0.5) * brushSize,
				y + (Math.random() - 0.5) * brushSize,
				2,
				0,
				Math.PI * 2
			);
			ctx.fill();
		}

		ctx.globalAlpha = 1;
		ctx.shadowBlur = 0;
	}

	function drawBubble(x, y) {
		const numBubbles = Math.random() > 0.6 ? 1 : Math.random() > 0.3 ? 2 : 0;

		for (let i = 0; i < numBubbles; i++) {
			const offsetX = (Math.random() - 0.5) * brushSize;
			const offsetY = (Math.random() - 0.5) * brushSize;
			const bubbleX = x + offsetX;
			const bubbleY = y + offsetY;
			const radius = Math.random() * brushSize * 0.7 + brushSize * 0.3;

			const gradient = ctx.createRadialGradient(
				bubbleX - radius * 0.3,
				bubbleY - radius * 0.3,
				radius * 0.1,
				bubbleX,
				bubbleY,
				radius
			);
			gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
			gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)');
			gradient.addColorStop(0.7, `${currentColor}40`);
			gradient.addColorStop(1, `${currentColor}80`);

			ctx.fillStyle = gradient;
			ctx.globalAlpha = 0.5;
			ctx.beginPath();
			ctx.arc(bubbleX, bubbleY, radius, 0, Math.PI * 2);
			ctx.fill();

			const iridescenceColors = [
				getLighterColor(currentColor, 0.6),
				getComplementaryColor(currentColor),
				getLighterColor(getComplementaryColor(currentColor), 0.4),
				getDarkerColor(currentColor, 0.2)
			];
			ctx.strokeStyle = iridescenceColors[Math.floor(Math.random() * iridescenceColors.length)];
			ctx.lineWidth = 2;
			ctx.globalAlpha = 0.6;
			ctx.beginPath();
			ctx.arc(bubbleX, bubbleY, radius, 0, Math.PI * 2);
			ctx.stroke();

			ctx.fillStyle = getLighterColor(currentColor, 0.9);
			ctx.globalAlpha = 0.9;
			ctx.beginPath();
			ctx.arc(bubbleX - radius * 0.35, bubbleY - radius * 0.35, radius * 0.25, 0, Math.PI * 2);
			ctx.fill();

			ctx.globalAlpha = 0.6;
			ctx.beginPath();
			ctx.arc(bubbleX + radius * 0.2, bubbleY + radius * 0.3, radius * 0.12, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.globalAlpha = 1;
	}

	function drawSpray(x, y) {
		const baseRadius = brushSize * 2;
		const density = brushSize * 8;

		const numClouds = Math.max(2, Math.floor(brushSize / 5));

		for (let c = 0; c < numClouds; c++) {
			const cloudOffsetX = (Math.random() - 0.5) * brushSize * 0.3;
			const cloudOffsetY = (Math.random() - 0.5) * brushSize * 0.3;
			const cloudCenterX = x + cloudOffsetX;
			const cloudCenterY = y + cloudOffsetY;

			for (let i = 0; i < density; i++) {
				const angle = Math.random() * Math.PI * 2;

				const randomValue = Math.random();
				const distance = Math.pow(randomValue, 0.6) * baseRadius;

				const offsetX = Math.cos(angle) * distance;
				const offsetY = Math.sin(angle) * distance;

				const edgeFactor = distance / baseRadius;
				const dotSize = Math.max(0.3, Math.random() * (2 - edgeFactor * 1.5) + 0.5);

				const edgeAlpha = Math.max(0.05, (1 - edgeFactor) * (0.4 + Math.random() * 0.4));

				ctx.fillStyle = currentColor;
				ctx.globalAlpha = edgeAlpha;
				ctx.beginPath();
				ctx.arc(cloudCenterX + offsetX, cloudCenterY + offsetY, dotSize, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		const coreDensity = Math.floor(brushSize * 2);
		for (let i = 0; i < coreDensity; i++) {
			const angle = Math.random() * Math.PI * 2;
			const distance = Math.random() * Math.random() * brushSize * 0.4;
			const offsetX = Math.cos(angle) * distance;
			const offsetY = Math.sin(angle) * distance;

			const dotSize = Math.random() * 1.5 + 0.8;
			ctx.fillStyle = currentColor;
			ctx.globalAlpha = Math.random() * 0.7 + 0.3;
			ctx.beginPath();
			ctx.arc(x + offsetX, y + offsetY, dotSize, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.globalAlpha = 1;
	}

	function drawNeon(x, y) {
		const neonColor = getLighterColor(currentColor, 0.6);
		const brightColor = getLighterColor(currentColor, 0.9);

		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		ctx.strokeStyle = neonColor;
		ctx.lineWidth = brushSize * 3;
		ctx.shadowBlur = 40;
		ctx.shadowColor = neonColor;
		ctx.globalAlpha = 0.2;
		ctx.beginPath();
		ctx.moveTo(lastX, lastY);
		ctx.lineTo(x, y);
		ctx.stroke();

		ctx.lineWidth = brushSize * 2;
		ctx.shadowBlur = 25;
		ctx.globalAlpha = 0.4;
		ctx.beginPath();
		ctx.moveTo(lastX, lastY);
		ctx.lineTo(x, y);
		ctx.stroke();

		ctx.lineWidth = brushSize * 1.2;
		ctx.shadowBlur = 15;
		ctx.globalAlpha = 0.8;
		ctx.beginPath();
		ctx.moveTo(lastX, lastY);
		ctx.lineTo(x, y);
		ctx.stroke();

		ctx.lineWidth = brushSize * 0.6;
		ctx.shadowBlur = 8;
		ctx.globalAlpha = 1;
		ctx.beginPath();
		ctx.moveTo(lastX, lastY);
		ctx.lineTo(x, y);
		ctx.stroke();

		ctx.strokeStyle = brightColor;
		ctx.lineWidth = brushSize * 0.3;
		ctx.shadowBlur = 10;
		ctx.shadowColor = neonColor;
		ctx.globalAlpha = 0.9;
		ctx.beginPath();
		ctx.moveTo(lastX, lastY);
		ctx.lineTo(x, y);
		ctx.stroke();

		ctx.globalAlpha = 1;
		ctx.shadowBlur = 0;
	}

	function animateParticles() {
		requestAnimationFrame(animateParticles);

		particles = particles.filter((p) => {
			p.x += p.vx;
			p.y += p.vy;
			p.vy += 0.3; // gravity
			p.life--;

			if (p.rotation !== undefined) {
				p.rotation += p.rotationSpeed;
			}

			if (p.life > 0) {
				ctx.globalAlpha = p.life / (p.maxLife || 60);
				ctx.fillStyle = p.color;

				ctx.save();
				ctx.translate(p.x, p.y);
				if (p.rotation !== undefined) {
					ctx.rotate(p.rotation);
				}

				switch (p.shape) {
					case 'circle':
						ctx.beginPath();
						ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
						ctx.fill();
						break;
					case 'triangle':
						ctx.beginPath();
						ctx.moveTo(0, -p.size / 2);
						ctx.lineTo(p.size / 2, p.size / 2);
						ctx.lineTo(-p.size / 2, p.size / 2);
						ctx.closePath();
						ctx.fill();
						break;
					case 'diamond':
						ctx.beginPath();
						ctx.moveTo(0, -p.size / 2);
						ctx.lineTo(p.size / 2, 0);
						ctx.lineTo(0, p.size / 2);
						ctx.lineTo(-p.size / 2, 0);
						ctx.closePath();
						ctx.fill();
						break;
					case 'star':
						ctx.beginPath();
						for (let i = 0; i < 10; i++) {
							const radius = i % 2 === 0 ? p.size / 2 : p.size / 4;
							const angle = (i * Math.PI) / 5;
							const px = Math.cos(angle) * radius;
							const py = Math.sin(angle) * radius;
							if (i === 0) ctx.moveTo(px, py);
							else ctx.lineTo(px, py);
						}
						ctx.closePath();
						ctx.fill();
						break;
					default: // rect
						ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
				}

				ctx.restore();
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
		saveToHistory();
	}

	function saveToHistory() {
		history = history.slice(0, historyStep + 1);

		const imageData = canvas.toDataURL();
		history.push(imageData);
		historyStep = history.length - 1;

		if (history.length > 50) {
			history.shift();
			historyStep--;
		}
	}

	function undo() {
		if (historyStep > 0) {
			historyStep--;
			restoreFromHistory();
		}
	}

	function redo() {
		if (historyStep < history.length - 1) {
			historyStep++;
			restoreFromHistory();
		}
	}

	function restoreFromHistory() {
		if (history[historyStep]) {
			const img = new Image();
			img.onload = () => {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(img, 0, 0);
			};
			img.src = history[historyStep];
		}
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

			<button
				class="action-btn undo-btn"
				onclick={undo}
				disabled={historyStep <= 0}
				title="Undo (Ctrl+Z)"
			>
				↶
			</button>
			<button
				class="action-btn redo-btn"
				onclick={redo}
				disabled={historyStep >= history.length - 1}
				title="Redo (Ctrl+Y)"
			>
				↷
			</button>
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
			<p>Are you sure you want to clear your artwork?</p>
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

	.undo-btn,
	.redo-btn {
		background: #74b9ff;
		color: white;
		border-color: #0984e3;
	}

	.undo-btn:disabled,
	.redo-btn:disabled {
		background: #b2bec3;
		border-color: #636e72;
		cursor: not-allowed;
		opacity: 0.5;
	}

	.undo-btn:disabled:hover,
	.redo-btn:disabled:hover {
		transform: none;
		box-shadow: none;
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
