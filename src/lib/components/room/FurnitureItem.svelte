<script>
	import { mount, tick } from 'svelte';

	let {
		furnitureInfo = $bindable(),
		x,
		y,
		selected = $bindable(false),
		onSelect,
		onMouseDown = null,
		onRemoveFromRoom,
		isRoomEditing = false,
		isInteractable,
		wallOnly,
		furnitureComponent,
		readOnly = false,
		data,
		showFurnitureSidebar,
		roomOwner = null,
		currentUser = null
	} = $props();

	/** @type {HTMLElement} */
	let componentContainer;
	let isModalOpen = $state(false);
	let isFlipped = $derived(furnitureInfo.flipped || false);

	/** @type {Record<string, string>} */
	const furnitureStrokeMap = {
		beanbag_white: 'beanbag_stroke.svg',
		beanbag_yellow: 'beanbag_stroke.svg',
		bed_simple_blue: 'bed_stroke.svg',
		bed_simple_green: 'bed_stroke.svg',
		bed_simple_red: 'bed_stroke.svg',
		bed_simple_yellow: 'bed_stroke.svg',
		bedside_round: 'bedside_round_stroke.svg',
		bedside_white: 'bedside_stroke.svg',
		bedside_wooden: 'bedside_stroke.svg',
		sofa_blue: 'sofa_stroke.svg',
		sofa_red: 'sofa_stroke.svg',
		cow_statue: 'cow_statue_stroke.svg'
	};
	const hasFlippedImage = ['cow_statue'];

	const furnitureAssets = $derived(() => {
		const type = String(furnitureInfo.type || 'cow_statue');
		const hasPhysicalFlip = hasFlippedImage.includes(type);
		const suffix = isFlipped && hasPhysicalFlip ? '_flipped' : '';

		const strokeFile = furnitureStrokeMap[type] || 'cow_statue_stroke.svg';
		const strokeSuffix = isFlipped && type === 'cow_statue' ? '_flipped' : '';
		const strokePath = strokeFile.replace('_stroke.svg', `${strokeSuffix}_stroke.svg`);

		return {
			image: `/room/${type}${suffix}.png`,
			stroke: `/room/${strokePath}`,
			useCssFlip: isFlipped && !hasPhysicalFlip
		};
	});

	async function toggleFlip() {
		const newFlippedState = !isFlipped;
		furnitureInfo.flipped = newFlippedState;

		try {
			const response = await fetch('/api/furniture', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					furnitureId: furnitureInfo.id,
					updates: {
						position: `${Math.round(x)},${Math.round(y)},${newFlippedState ? '1' : '0'}`
					}
				})
			});

			const result = await response.json();
			if (!result.success) {
				console.error('Failed to update furniture flip:', result.error);
				furnitureInfo.flipped = !newFlippedState;
			}
		} catch (error) {
			console.error('Error updating furniture flip:', error);
			furnitureInfo.flipped = !newFlippedState;
		}
	}

	/**
	 * @param {'view' | 'edit'} mode
	 */
	async function openModal(mode) {
		isModalOpen = true;
		await tick();
		mount(furnitureComponent, {
			target: componentContainer,
			props: {
				data: data,
				mode: mode,
				id: furnitureInfo.id,
				roomOwner: roomOwner?.recId || null,
				currentUser: currentUser
			}
		});
		showFurnitureSidebar(false);
	}

	async function closeModal() {
		isModalOpen = false;

		// Check if this is an empty sticky note and delete it
		if (furnitureInfo.type === 'sticky_note') {
			try {
				const noteData = furnitureInfo.data ? JSON.parse(furnitureInfo.data) : {};
				if (!noteData.message || !noteData.message.trim()) {
					const response = await fetch('/api/furniture', {
						method: 'DELETE',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							furnitureId: furnitureInfo.id
						})
					});

					const result = await response.json();

					if (result.success) {
						if (typeof window !== 'undefined') {
							const url = new URL(window.location.href);
							if (!url.searchParams.has('skipNotification')) {
								url.searchParams.set('skipNotification', 'true');
								window.location.href = url.toString();
							} else {
								location.reload();
							}
						}
					}
				}
			} catch (e) {
				console.error('Error checking empty sticky note:', e);
			}
		}

		if (isRoomEditing) {
			showFurnitureSidebar(true);
		}
	}

	$effect(() => {
		if (typeof window !== 'undefined' && furnitureInfo.type === 'sticky_note') {
			const autoOpenId = sessionStorage.getItem('autoOpenStickyNote');
			if (autoOpenId === furnitureInfo.id) {
				// Clear the flag
				sessionStorage.removeItem('autoOpenStickyNote');
				// Open in edit mode
				openModal('edit');
			}
		}
	});
</script>

<div
	class="furniture-item {selected ? 'selected' : ''} {isRoomEditing ? 'editing-mode' : ''} {wallOnly
		? 'wall-only'
		: ''}"
	style:--x={x}
	style:--y={y}
	style:--z={Math.round(y)}
	onclick={(e) => {
		e.stopPropagation();
		if (isRoomEditing && onSelect) onSelect();
		if (!isRoomEditing && isInteractable) {
			openModal('view');
		}
	}}
	onmousedown={(e) => {
		if (isRoomEditing && onMouseDown) {
			e.stopPropagation();
			onMouseDown(e);
		}
	}}
	role="button"
	tabindex={isRoomEditing ? 0 : -1}
>
	<img
		class="furniture-img {furnitureAssets().useCssFlip ? 'css-flipped' : ''}"
		src={furnitureAssets().image}
		alt="Furniture"
	/>

	{#if isRoomEditing}
		<img
			class="furniture-stroke {furnitureAssets().useCssFlip ? 'css-flipped' : ''}"
			src={furnitureAssets().stroke}
			alt="Furniture outline"
		/>
	{/if}

	{#if selected && isRoomEditing && !readOnly}
		<div class="furniture-controls">
			{#if !wallOnly}
				<button class="rotate-furniture-btn" onclick={toggleFlip} aria-label="Flip furniture">
					↻
				</button>
			{/if}
			<button
				class="delete-furniture-btn"
				onclick={() => {
					if (onRemoveFromRoom) onRemoveFromRoom(furnitureInfo.id);
				}}
				aria-label="Remove furniture from room"
			>
				🗑️
			</button>
			{#if isInteractable}
				<button
					class="interact-furniture-btn"
					onclick={() => {
						openModal('edit');
					}}
					aria-label="Interact with furniture"
				>
					✍️
				</button>
			{/if}
		</div>
	{/if}
</div>

{#if isModalOpen}
	<div class="modal-overlay" onclick={closeModal}></div>
	<div class="furniture-component-container" bind:this={componentContainer}></div>
{/if}

<style>
	.furniture-item {
		position: absolute;
		z-index: calc(100 + var(--z));

		display: flex;
		justify-content: center;
		align-items: center;

		transform: translate(calc(var(--x) * 1px), calc(var(--y) * 1px));
	}

	/* Wall-only items should always appear on top of floor items */
	.furniture-item.wall-only {
		z-index: 400;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		z-index: 9998;
		cursor: pointer;
	}

	.furniture-component-container {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 9999 !important;
		pointer-events: auto;
	}

	.furniture-item.selected {
		z-index: calc(1000 + var(--z));
	}

	/* Selected wall-only items */
	.furniture-item.wall-only.selected {
		z-index: 1400;
	}

	.furniture-item.editing-mode {
		cursor: grab;
	}

	.furniture-item.editing-mode.selected {
		cursor: grab;
	}

	.furniture-item.editing-mode .furniture-img {
		pointer-events: none;
	}

	.furniture-item.editing-mode.selected .furniture-img {
		filter: drop-shadow(-6px -6px 0 var(--orange)) drop-shadow(6px -6px 0 var(--orange))
			drop-shadow(-6px 6px 0 var(--orange)) drop-shadow(6px 6px 0 var(--orange));
	}

	.furniture-img {
		width: auto;
		height: auto;
		position: absolute;
		transition: filter 0.2s;
		transform: scale(0.3);
	}

	.furniture-img.css-flipped {
		transform: scale(0.3) scaleX(-1);
	}

	.furniture-stroke {
		position: absolute;
		width: auto;
		height: auto;
		transform: scale(0.3);
	}

	.furniture-stroke.css-flipped {
		transform: scale(0.3) scaleX(-1);
	}

	.furniture-item.editing-mode:hover .furniture-img,
	.furniture-item.editing-mode.selected .furniture-img {
		filter: drop-shadow(-6px -6px 0 var(--orange)) drop-shadow(6px -6px 0 var(--orange))
			drop-shadow(-6px 6px 0 var(--orange)) drop-shadow(6px 6px 0 var(--orange));
	}

	.furniture-controls {
		position: absolute;
		top: -50px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 8px;
		z-index: 1500;
		align-items: center;
	}

	.rotate-furniture-btn,
	.delete-furniture-btn,
	.interact-furniture-btn {
		padding: 6px 12px 10px;
		border: 2px solid var(--orange);
		border-radius: 50px;
		background: var(--yellow);
		color: var(--orange);
		font-family: inherit;
		font-size: 1em;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
		line-height: 1;
	}

	.rotate-furniture-btn:hover {
		background: var(--orange);
		color: white;
		transform: rotate(180deg);
	}

	.delete-furniture-btn:hover {
		background: #ff4444;
		border-color: #ff4444;
		color: white;
	}
</style>
