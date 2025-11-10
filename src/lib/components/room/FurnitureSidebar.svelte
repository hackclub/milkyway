<script>
	import { onMount } from 'svelte';
	import { FURNITURE_TYPES } from '$lib/furniture-catalog.js';
	import ArtEasel from '$lib/components/furniture/ArtEasel.svelte';
	import ArcadeCabinet from '$lib/components/furniture/ArcadeCabinet.svelte';

	let { furnitureList = $bindable([]), user, onClose } = $props();

	// Available furniture types from static assets
	// Set purchasable: false for items that can only be obtained through rewards/events
	const availableFurnitureTypes = [
		{ type: 'beanbag_white', name: 'white beanbag', cost: 12, purchasable: true },
		{ type: 'beanbag_yellow', name: 'yellow beanbag', cost: 12, purchasable: true },
		{ type: 'bed_simple_blue', name: 'blue bed', cost: 15, purchasable: true },
		{ type: 'bed_simple_green', name: 'green bed', cost: 15, purchasable: true },
		{ type: 'bed_simple_red', name: 'red bed', cost: 15, purchasable: true },
		{ type: 'bed_simple_yellow', name: 'yellow bed', cost: 15, purchasable: true },
		{ type: 'bedside_round', name: 'round bedside table', cost: 8, purchasable: true },
		{ type: 'bedside_white', name: 'white bedside table', cost: 8, purchasable: true },
		{ type: 'bedside_wooden', name: 'wooden bedside table', cost: 8, purchasable: true },
		{ type: 'sofa_blue', name: 'blue sofa', cost: 12, purchasable: true },
		{ type: 'sofa_red', name: 'red sofa', cost: 12, purchasable: true },
		{ type: 'flower_cushion', name: 'flower cushion', cost: 0, purchasable: false },
		{ type: 'cow_statue', name: 'cow statue', cost: 0, purchasable: false },
		{
			type: 'art_easel',
			name: 'art easel',
			cost: 40,
			isInteractable: true,
			component: ArtEasel,
			purchasable: true
		},
		{
			type: 'arcade_cabinet',
			name: 'arcade cabinet',
			cost: 60,
			isInteractable: true,
			component: ArcadeCabinet,
			purchasable: true
		}
	];

	let userCurrency = $state({ paintchips: 0 });
	let purchasingItems = $state(/** @type {Set<string>} */ (new Set()));
	let errorMessage = $state('');
	let successMessage = $state('');

	// Group furniture by type and count owned vs placed
	/** @type {Record<string, {type: string, name: string, cost: number, owned: number, placed: number, instances: any[]}>} */
	let furnitureOwnership = $state({});

	// Update furniture ownership when furnitureList changes
	$effect(() => {
		/** @type {Record<string, {type: string, name: string, cost: number, owned: number, placed: number, instances: any[]}>} */
		const ownership = {};

		FURNITURE_TYPES.forEach((furnitureType) => {
			const owned = furnitureList.filter(
				/** @param {any} f */ (f) => f.type === furnitureType.type
			);
			const placed = owned.filter(/** @param {any} f */ (f) => f.isPlaced);

			ownership[furnitureType.type] = {
				...furnitureType,
				owned: owned.length,
				placed: placed.length,
				instances: owned
			};
		});

		furnitureOwnership = ownership;
	});

	// Get owned and unowned furniture
	/** @type {any[]} */
	let ownedFurniture = $state([]);
	/** @type {any[]} */
	let unownedFurniture = $state([]);

	// Update owned/unowned furniture when ownership changes
	$effect(() => {
		const owned = Object.values(furnitureOwnership).filter(
			/** @param {any} f */ (f) => f.owned > 0
		);
		// Only show purchasable items in the "Buy Furniture" section
		const unowned = Object.values(furnitureOwnership).filter(
			/** @param {any} f */ (f) => f.owned === 0 && f.purchasable !== false
		);
		ownedFurniture = owned;
		unownedFurniture = unowned;
	});

	async function loadUserCurrency() {
		try {
			const response = await fetch('/api/get-user-data');
			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					userCurrency = {
						paintchips: result.paintchips || 0
					};
				}
			}
		} catch (error) {
			console.error('Error loading user currency:', error);
		}
	}

	/**
	 * @param {string} furnitureType
	 */
	async function purchaseFurniture(furnitureType) {
		if (purchasingItems.has(furnitureType)) return;

		const furniture = furnitureOwnership[furnitureType];
		if (!furniture || userCurrency.paintchips < furniture.cost) return;

		purchasingItems.add(furnitureType);
		purchasingItems = new Set(purchasingItems); // Trigger reactivity

		try {
			// Purchase furniture directly (separate from shop system)
			const purchaseResponse = await fetch('/api/purchase-furniture', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					furnitureType: furnitureType
				})
			});

			const purchaseResult = await purchaseResponse.json();

			if (purchaseResult.success) {
				// Update currency
				userCurrency = purchaseResult.currency;

				// Add the new furniture and immediately place it in room
				if (purchaseResult.furniture) {
					const newFurniture = purchaseResult.furniture;
					// Place it immediately
					await placeFurniture(newFurniture.id);
				}
			} else {
				errorMessage = `Purchase failed: ${purchaseResult.error}`;
				setTimeout(() => (errorMessage = ''), 3000);
			}
		} catch (error) {
			console.error('Purchase error:', error);
			errorMessage = 'Purchase failed. Please try again.';
			setTimeout(() => (errorMessage = ''), 3000);
		} finally {
			purchasingItems.delete(furnitureType);
			purchasingItems = new Set(purchasingItems); // Trigger reactivity
		}
	}

	/**
	 * @param {string} furnitureId
	 */
	async function placeFurniture(furnitureId) {
		try {
			// Generate random position for the furniture
			const randomX = Math.random() * (120 - -120) + -120; // Range: -120 to 120
			const randomY = Math.random() * (220 - 80) + 80; // Range: 80 to 220
			const position = `${randomX},${randomY},0`;

			const response = await fetch('/api/furniture', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					furnitureId: furnitureId,
					updates: {
						position: position
					}
				})
			});

			const result = await response.json();

			if (result.success) {
				// Update local furniture list
				const furnitureIndex = furnitureList.findIndex((f) => f.id === furnitureId);
				if (furnitureIndex !== -1) {
					furnitureList[furnitureIndex] = {
						...furnitureList[furnitureIndex],
						position: position,
						x: randomX,
						y: randomY,
						isPlaced: true
					};
					furnitureList = [...furnitureList]; // Trigger reactivity
				} else {
					// If furniture not in list yet (newly purchased), add it
					const updatedFurniture = result.furniture || {
						id: furnitureId,
						position: position,
						x: randomX,
						y: randomY,
						isPlaced: true,
						flipped: false
					};
					furnitureList = [...furnitureList, updatedFurniture];
				}
			} else {
				errorMessage = `Failed to place furniture: ${result.error}`;
				setTimeout(() => (errorMessage = ''), 3000);
			}
		} catch (error) {
			console.error('Error placing furniture:', error);
			errorMessage = 'Failed to place furniture. Please try again.';
			setTimeout(() => (errorMessage = ''), 3000);
		}
	}

	/**
	 * @param {string} furnitureId
	 */
	async function removeFurnitureFromRoom(furnitureId) {
		try {
			const response = await fetch('/api/furniture', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					furnitureId: furnitureId,
					updates: {
						position: 'inventory'
					}
				})
			});

			const result = await response.json();

			if (result.success) {
				// Update local furniture list
				const furnitureIndex = furnitureList.findIndex((f) => f.id === furnitureId);
				if (furnitureIndex !== -1) {
					furnitureList[furnitureIndex] = {
						...furnitureList[furnitureIndex],
						position: 'inventory',
						x: 0,
						y: 0,
						isPlaced: false
					};
					furnitureList = [...furnitureList]; // Trigger reactivity
				}
			} else {
				errorMessage = `Failed to remove furniture: ${result.error}`;
				setTimeout(() => (errorMessage = ''), 3000);
			}
		} catch (error) {
			console.error('Error removing furniture:', error);
			errorMessage = 'Failed to remove furniture. Please try again.';
			setTimeout(() => (errorMessage = ''), 3000);
		}
	}

	onMount(() => {
		loadUserCurrency();
	});
</script>

<div class="furniture-sidebar">
	<div class="furniture-sidebar-header">
		<h3>Furniture</h3>
	</div>

	<div class="furniture-sidebar-content">
		<!-- Error/Success Messages -->
		{#if errorMessage}
			<div class="message error-message">{errorMessage}</div>
		{/if}
		{#if successMessage}
			<div class="message success-message">{successMessage}</div>
		{/if}

		<!-- User Currency -->
		<div class="currency-display">
			<div class="currency-item">
				<img src="/paintchip.png" alt="paintchip" class="currency-icon" />
				<span>{userCurrency.paintchips}</span>
			</div>
		</div>

		<!-- Owned Furniture -->
		<div class="furniture-section">
			<h4>Your Furniture ({ownedFurniture.length})</h4>
			{#if ownedFurniture.length > 0}
				<div class="furniture-list">
					{#each ownedFurniture as furniture}
						<div class="furniture-item owned">
							<div class="furniture-image-container">
								<img
									class="furniture-image"
									src="/room/{furniture.type}.png"
									alt={furniture.name}
								/>
							</div>
							<div class="furniture-details">
								<div class="furniture-info-row">
									<span class="count-badge">×{furniture.owned}</span>
									{#if furniture.placed > 0}
										<span class="placed-badge">🏠{furniture.placed}</span>
									{/if}
								</div>
								<div class="furniture-actions">
									{#if furniture.placed < furniture.owned}
										<button
											class="place-button"
											onclick={() => {
												const unplaced = furniture.instances.find(
													/** @param {any} f */ (f) => !f.isPlaced
												);
												if (unplaced) placeFurniture(unplaced.id);
											}}
											title="Place furniture in room"
										>
											Place
										</button>
									{/if}
									{#if furniture.purchasable !== false}
										<button
											class="purchase-button"
											onclick={() => purchaseFurniture(furniture.type)}
											disabled={userCurrency.paintchips < furniture.cost ||
												purchasingItems.has(furniture.type)}
											title="Buy another"
										>
											{purchasingItems.has(furniture.type) ? '...' : `${furniture.cost}💰`}
										</button>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="no-furniture">No furniture owned</p>
			{/if}
		</div>

		<!-- Available Furniture to Purchase -->
		<div class="furniture-section">
			<h4>Buy Furniture ({unownedFurniture.length})</h4>
			{#if unownedFurniture.length > 0}
				<div class="furniture-list">
					{#each unownedFurniture as furniture}
						<div class="furniture-item unowned">
							<div class="furniture-image-container">
								<img
									class="furniture-image"
									src="/room/{furniture.type}.png"
									alt={furniture.name}
								/>
							</div>
							<div class="furniture-details">
								<button
									class="purchase-button full-width"
									onclick={() => purchaseFurniture(furniture.type)}
									disabled={userCurrency.paintchips < furniture.cost ||
										purchasingItems.has(furniture.type)}
									title="Purchase furniture"
								>
									{purchasingItems.has(furniture.type) ? '...' : `${furniture.cost}💰`}
								</button>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="all-owned">All furniture owned! 🎉</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.furniture-sidebar {
		position: fixed;
		top: 0;
		right: 0;
		width: 450px;
		height: 100vh;
		background-color: #fbf2bf;
		border-left: 4px solid #f7c881;
		display: flex;
		flex-direction: column;
		z-index: 1000;
		font-family: 'Futura', sans-serif;
		overflow-y: auto;
	}

	.furniture-sidebar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px;
		border-bottom: 2px solid #f7c881;
		background-color: #fff9e6;
	}

	.furniture-sidebar-header h3 {
		margin: 0;
		color: #333;
		font-size: 1.2em;
		font-weight: 800;
	}

	.furniture-sidebar-content {
		flex: 1;
		padding: 16px 20px;
		overflow-y: auto;
	}

	.message {
		padding: 10px 12px;
		border-radius: 6px;
		margin-bottom: 12px;
		font-size: 0.8em;
		font-weight: 700;
		text-align: center;
		animation: slideIn 0.3s ease;
	}

	.error-message {
		background-color: #ffe6e6;
		border: 2px solid #ff6b6b;
		color: #cc0000;
	}

	.success-message {
		background-color: #e6ffe6;
		border: 2px solid #4caf50;
		color: #006400;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.currency-display {
		display: flex;
		justify-content: center;
		margin-bottom: 20px;
	}

	.currency-item {
		display: flex;
		align-items: center;
		gap: 6px;
		background-color: white;
		border: 2px solid #e6819f;
		border-radius: 6px;
		padding: 8px 12px;
		font-weight: 800;
		color: #333;
		font-size: 0.9em;
	}

	.currency-icon {
		width: 16px;
		height: 16px;
		object-fit: contain;
		filter: drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white)
			drop-shadow(-1px 1px 0 white) drop-shadow(1px 1px 0 white);
	}

	.furniture-section {
		margin-bottom: 24px;
	}

	.furniture-section h4 {
		margin: 0 0 12px 0;
		color: #333;
		font-size: 1em;
		font-weight: 800;
		text-align: center;
	}

	.furniture-list {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
	}

	.furniture-item {
		background-color: white;
		border: 3px solid;
		border-radius: 8px;
		overflow: hidden;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
	}

	.furniture-item.owned {
		border-color: #73ace0;
	}

	.furniture-item.unowned {
		border-color: #e6819f;
	}

	.furniture-item:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.furniture-image-container {
		height: 80px;
		background-color: #fff9e6;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px;
		position: relative;
	}

	.furniture-image {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}

	.furniture-details {
		padding: 8px;
		background-color: white;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.furniture-info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 4px;
	}

	.count-badge {
		font-size: 0.7em;
		font-weight: 800;
		color: #333;
		background-color: #fbf2bf;
		padding: 2px 6px;
		border-radius: 4px;
		border: 1px solid #f7c881;
	}

	.placed-badge {
		font-size: 0.65em;
		background-color: #e6f3ff;
		border: 1px solid #73ace0;
		padding: 2px 6px;
		border-radius: 4px;
		color: #333;
		font-weight: 700;
	}

	.furniture-actions {
		display: flex;
		gap: 4px;
	}

	.place-button,
	.purchase-button {
		padding: 6px 10px;
		border: 2px solid;
		border-radius: 6px;
		font-family: 'Futura', sans-serif;
		font-weight: 800;
		font-size: 0.75em;
		cursor: pointer;
		transition: all 0.2s ease;
		flex: 1;
	}

	.purchase-button.full-width {
		flex: none;
		width: 100%;
	}

	.place-button {
		background-color: #73ace0;
		border-color: #73ace0;
		color: white;
	}

	.place-button:hover {
		background-color: #5a9bd4;
		border-color: #5a9bd4;
	}

	.purchase-button {
		background-color: #e6819f;
		border-color: #e6819f;
		color: white;
	}

	.purchase-button:hover:not(:disabled) {
		background-color: #d4708f;
		border-color: #d4708f;
	}

	.purchase-button:disabled {
		background-color: #ccc;
		border-color: #ccc;
		color: #999;
		cursor: not-allowed;
	}

	.no-furniture,
	.all-owned {
		text-align: center;
		color: #666;
		font-style: italic;
		padding: 12px;
		background-color: #f8f8f8;
		border-radius: 6px;
		border: 2px dashed #ccc;
		font-size: 0.8em;
		margin: 0;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.furniture-sidebar {
			width: 100vw;
			height: 50vh;
			bottom: 0;
			top: auto;
			right: 0;
			left: 0;
			border-left: none;
			border-top: 4px solid #f7c881;
		}

		.furniture-sidebar-content {
			padding: 12px 16px;
		}

		.furniture-list {
			grid-template-columns: repeat(3, 1fr);
			gap: 8px;
		}
	}
</style>
