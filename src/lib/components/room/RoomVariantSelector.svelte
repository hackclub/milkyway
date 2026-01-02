<script>
	let {
		variants = [
			{ id: 'default', label: 'default', preview: '/room/walls/room_default.png' },
			{ id: 'pink', label: 'pink', preview: '/room/walls/room_pink.png' },
			{ id: 'clouds', label: 'clouds', preview: '/room/walls/room_clouds.png' },
			{ id: 'mimo', label: 'mimo', preview: '/room/walls/room_mimo.png' },
			{ id: 'glitched', label: 'glitched', preview: '/room/walls/room_glitched.png' },
			{ id: 'gradient', label: 'gradient', preview: '/room/walls/room_gradient.png' }
		],
		selectedVariant = $bindable('default'),
		disabled = false
	} = $props();

	let failedImages = $state(new Set());
	function handleSelect(variantId) {
		if (disabled || variantId === selectedVariant) return;
		selectedVariant = variantId;
	}

	function handleImageError(event, variantId) {
		failedImages.add(variantId);
		failedImages = failedImages;
		console.error('Failed to load preview image for variant:', variantId);
	}
</script>

<div class="variant-selector" aria-label="Room variant selector">
	<p class="selector-label">room variants</p>
	<div class="variant-grid">
		{#each variants as variantItem (variantItem.id)}
			<button
				type="button"
				class="variant-option {selectedVariant === variantItem.id ? 'selected' : ''}"
				onclick={() => handleSelect(variantItem.id)}
				{disabled}
				aria-pressed={selectedVariant === variantItem.id}
			>
				<span
					class="preview {failedImages.has(variantItem.id) ? 'failed' : ''}"
					style={`background-image: url('${variantItem.preview}?v=${Date.now()}')`}
					role="img"
					aria-label="Preview for {variantItem.label} variant"
				>
					<img
						src={variantItem.preview}
						alt=""
						aria-hidden="true"
						onerror={(e) => handleImageError(e, variantItem.id)}
						style="width: 0; height: 0; display: none;"
					/>
				</span>
				<span class="label">{variantItem.label}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.variant-selector {
		background: rgba(0, 0, 0, 0.6);
		border: 2px solid rgba(255, 255, 255, 0.5);
		border-radius: 16px;
		padding: 16px;
		width: 260px;
		height: 200px;
		overflow: scroll;
		color: white;
		backdrop-filter: blur(8px);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}

	.selector-label {
		margin: 0 0 12px;
		font-size: 0.9rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		opacity: 0.95;
	}

	.variant-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}

	.variant-option {
		background: rgba(255, 255, 255, 0.08);
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		padding: 8px;
		color: inherit;
		font-family: inherit;
		font-size: 0.75rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 8px;
		transition:
			transform 0.2s ease,
			border-color 0.2s ease,
			background 0.2s ease,
			box-shadow 0.2s ease;
		cursor: pointer;
		position: relative;
		overflow: hidden;
	}

	.variant-option:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.4);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
	}

	.variant-option .preview {
		width: 100%;
		padding-top: 60%;
		background-size: cover;
		background-position: center;
		border-radius: 8px;
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.2),
			0 2px 8px rgba(0, 0, 0, 0.2);
		transition: box-shadow 0.2s ease;
	}

	.variant-option .preview.failed {
		background:
			linear-gradient(
				135deg,
				rgba(255, 255, 255, 0.1) 25%,
				transparent 25%,
				transparent 75%,
				rgba(255, 255, 255, 0.1) 75%,
				rgba(255, 255, 255, 0.1)
			),
			linear-gradient(
				135deg,
				rgba(255, 255, 255, 0.1) 25%,
				transparent 25%,
				transparent 75%,
				rgba(255, 255, 255, 0.1) 75%,
				rgba(255, 255, 255, 0.1)
			);
		background-size: 20px 20px;
		background-position:
			0 0,
			10px 10px;
		background-color: rgba(255, 100, 100, 0.1);
		position: relative;
	}

	.variant-option .preview.failed::after {
		content: '⚠';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 1.5rem;
		opacity: 0.6;
	}

	.variant-option:hover:not(:disabled) .preview {
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.3),
			0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.variant-option .label {
		text-transform: capitalize;
		font-weight: 500;
		letter-spacing: 0.05em;
	}

	.variant-option.selected {
		border-color: #fff;
		background: rgba(255, 255, 255, 0.25);
		transform: translateY(-3px);
		box-shadow: 0 6px 16px rgba(255, 255, 255, 0.2);
	}

	.variant-option.selected::before {
		content: '✓';
		position: absolute;
		top: 6px;
		right: 6px;
		background: white;
		color: black;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.7rem;
		font-weight: bold;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
	}

	.variant-option.selected .preview {
		box-shadow:
			inset 0 0 0 2px rgba(255, 255, 255, 0.5),
			0 4px 16px rgba(255, 255, 255, 0.15);
	}

	.variant-option:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.variant-option:active:not(:disabled) {
		transform: translateY(-1px);
	}

	@media (max-width: 600px) {
		.variant-selector {
			width: 100%;
		}

		.variant-grid {
			grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
			gap: 10px;
		}
	}
</style>
