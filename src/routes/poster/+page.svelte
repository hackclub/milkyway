<script>
	import { onMount } from 'svelte';
	
	let { data = { user: null } } = $props();
	
	const posters = [
		{ name: 'Black and White', file: 'black and white poster.png' },
		{ name: 'Full Color', file: 'full color poster.png' },
		{ name: 'Simple', file: 'simple poster.png' }
	];
	
	/** @type {Record<string, HTMLCanvasElement>} */
	let canvases = $state({});
	let loading = $state(true);
	
	onMount(async () => {
		// Dynamically import qrcode to avoid SSR issues
		const QRCode = (await import('qrcode')).default;
		
		const username = data.user?.username;
		const qrUrl = username 
			? `https://milkyway.hackclub.com?from=${encodeURIComponent(username)}`
			: 'https://milkyway.hackclub.com';
		
		// Generate QR code for each poster
		for (const poster of posters) {
			await generatePosterWithQR(poster.file, qrUrl, QRCode);
		}
		
		loading = false;
	});
	
	/**
	 * @param {string} posterFile
	 * @param {string} qrUrl
	 * @param {any} QRCode
	 */
	async function generatePosterWithQR(posterFile, qrUrl, QRCode) {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		
		if (!ctx) {
			console.error('Failed to get canvas context');
			return;
		}
		
		// Load the poster image
		const img = new Image();
		img.crossOrigin = 'anonymous';
		
		await new Promise((resolve, reject) => {
			img.onload = resolve;
			img.onerror = reject;
			img.src = `/posters/${posterFile}`;
		});
		
		// Set canvas size to match image
		canvas.width = img.width;
		canvas.height = img.height;
		
		// Draw the poster
		ctx.drawImage(img, 0, 0);
		
		// Generate QR code
		const qrSize = Math.min(img.width, img.height) * 0.2; // 15% of the smaller dimension
		const qrCanvas = document.createElement('canvas');
		
		await QRCode.toCanvas(qrCanvas, qrUrl, {
			width: qrSize,
			margin: 1,
			color: {
				dark: '#000000',
				light: '#FFFFFF'
			}
		});
		
		// Position QR code at bottom right with some padding
		const padding = 20;
		const qrX = img.width - qrSize - padding - 120;
		const qrY = img.height - qrSize - padding - 120;
		
		// Draw white background for QR code
		ctx.fillStyle = 'white';
		ctx.fillRect(qrX - padding/2, qrY - padding/2, qrSize + padding, qrSize + padding);
		
		// Draw QR code
		ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
		
		// Store the canvas
		canvases[posterFile] = canvas;
	}
	
	/**
	 * @param {string} posterFile
	 * @param {string} posterName
	 */
	function downloadPoster(posterFile, posterName) {
		const canvas = canvases[posterFile];
		if (!canvas) return;
		
		// Convert canvas to blob and trigger download
		canvas.toBlob((blob) => {
			if (!blob) return;
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${posterName.toLowerCase().replace(/\s+/g, '-')}.png`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}, 'image/png');
	}
</script>

<svelte:head>
	<title>Posters ✦ Milkyway</title>
</svelte:head>

<main class="poster-page">
	<div class="axolotl-container">
		<a class="back-button" href="/home">← back</a>
		
		<div class="poster-title">
			<h1>yippee, your posters!</h1>
			<p class="poster-subtitle">
				{#if data.user}
					QR codes link to: https://milkyway.hackclub.com?from={data.user.username}
				{:else}
					QR codes link to: https://milkyway.hackclub.com
				{/if}
			</p>
		</div>
		
		{#if loading}
			<div class="loading-message">
				<p>generating your posters...</p>
			</div>
		{:else}
			<div class="posters-container">
				{#each posters as poster}
					<div class="poster-card">
						<div class="poster-preview">
							{#if canvases[poster.file]}
								<img 
									src={canvases[poster.file].toDataURL()} 
									alt={poster.name}
									class="poster-image"
								/>
							{/if}
						</div>
						<div class="poster-info">
							<h3>{poster.name}</h3>
							<button 
								class="download-button"
								onclick={() => downloadPoster(poster.file, poster.name)}
							>
								download
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</main>

<style>
	.poster-page {
        min-width: 100%;
		margin: 0 auto;
		padding: 2rem;
		font-family: 'Futura LT', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background-color: #739ACE;
        min-height: 100%;

        text-align: center;
	}
	

	
    .posters-container {
        display: flex;
        flex-flow: row;
        justify-content: center;
        gap: 1.5rem;
        margin-top: 2rem;
        max-width: 90%;
        margin-left: auto;
        margin-right: auto;
    }

	
	.poster-card {
		overflow: hidden;
		max-width: 33%
	}
	
	.poster-preview {
		width: 100%;
		background: #f9f9f9;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.poster-image {
		width: 100%;
		height: auto;
		display: block;


		object-fit: contain;
	}
	
	.poster-info {
		padding: 1rem;
		text-align: center;
        background-color: white;
        margin-top: 8px;
	}
	
	.poster-info h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
		color: #333;
	}
	
	.download-button {
        background-color: var(--yellow);
		border: none;
		padding: 0.6rem 1rem;
		border-radius: 8px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s;
		width: 100%;
	}
	
	
	@media (max-width: 900px) {
        .posters-container {
            flex-flow: column;
            align-items: center;
            justify-content: center;
        }
       
		.poster-card {
			max-width: 100%;
		}
	}
	
	@media (max-width: 768px) {
		.poster-page {
			padding: 1rem;
		}
		
		.header h1 {
			font-size: 2rem;
		}
	}
</style>

