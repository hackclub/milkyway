<script>
	import FloorTile from '$lib/components/FloorTile.svelte';
	import ProjectEgg from '$lib/components/room/ProjectEgg.svelte';
	import FurnitureItem from '$lib/components/room/FurnitureItem.svelte';
	import ExpandableButton from '$lib/components/ExpandableButton.svelte';
	import { FURNITURE_TYPES } from '$lib/furniture-catalog';
	import Notifications from '$lib/components/Notifications.svelte';
	import Devlogs from '$lib/components/devlogs/Devlogs.svelte';
	import RoomVariantSelector from '$lib/components/room/RoomVariantSelector.svelte';

	let {
		projectList = $bindable([]),
		furnitureList = $bindable([]),
		isCreateOpen = $bindable(false),
		user,
		currentUser = null,
		onShowPromptPopup,
		onOpenRouletteSpin,
		onDeleteProject,
		onShipProject,
		onPaintChipsClaimed = null,
		readOnly = false,
		selectedProjectId = null,
		onSelectProject = null,
		hideControls = false,
		showFurnitureSidebar = $bindable(false),
		variant,
		stellarShipProjectIds = new Set()
	} = $props();

	let isEditingRoom = $state(false);
	let selectedVariant = $state('default');

	let selectedEggForMove = $state(null);
	let selectedFurnitureForMove = $state(null);
	let isPlacingStickyNote = $state(false);
	let isPlacingStickyNoteLoading = $state(false);

	// References to ProjectEgg components for calling their methods
	/** @type {any[]} */
	let projectEggRefs = $state([]);

	// Use external selectedProjectId if provided, otherwise use local state
	let localSelectedEggId = $state(null);
	let selectedEggId = $derived(selectedProjectId !== null ? selectedProjectId : localSelectedEggId);
	let localSelectedFurnitureId = $state(null);
	let selectedFurnitureId = $derived(localSelectedFurnitureId);
	let originalPositions = $state(/** @type {any[]} */ ([]));
	let originalFurniturePositions = $state(/** @type {any[]} */ ([]));
	let isDragging = $state(false);
	let isMouseDown = $state(false);
	let isSaving = $state(false);
	let dragStartPos = $state({ x: 0, y: 0 });
	let dragOffset = $state({ x: 0, y: 0 });

	let devlogs = $state(/** @type {any[]} */ ([]));

	$effect(() => {
		let cancelled = false;
		if (!user || !user.username) {
			devlogs = [];
			return;
		}

		(async () => {
			try {
				const res = await fetch('/api/get-user-devlogs', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ username: user.username })
				});
				const data = await res.json();
				if (!cancelled) devlogs = data.devlogs || [];
			} catch (err) {
				console.error('Failed to fetch devlogs:', err);
				if (!cancelled) devlogs = [];
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		// Always sync variant prop to selectedVariant state, using nullish coalescing
		const incomingVariant = variant ?? 'default';
		console.log(
			'Room: variant prop changed to',
			incomingVariant,
			'| isEditingRoom:',
			isEditingRoom,
			'| current selectedVariant:',
			selectedVariant
		);
		if (!isEditingRoom) {
			selectedVariant = incomingVariant;
		}
	});

	// Floor bounds - true rhombus shape (diamond)
	// Based on: top (0,0), left (-300,150), right (300,150), bottom (0,300)
	const FLOOR_BOUNDS = {
		topY: -60, // Top point of the rhombus
		middleY: 160, // Widest point (middle)
		bottomY: 260, // Bottom point of the rhombus
		maxWidth: 640 // Width at the middle (320 on each side) - expanded for more placement space
	};

	// Calculate allowed X range based on Y position (rhombus/diamond shape)
	/**
	 * @param {number} y
	 */
	function getAllowedXRange(y) {
		// Clamp Y to floor bounds first
		const clampedY = Math.max(FLOOR_BOUNDS.topY, Math.min(FLOOR_BOUNDS.bottomY, y));

		let width;

		if (clampedY <= FLOOR_BOUNDS.middleY) {
			// Top half: expanding from top to middle
			const progress = (clampedY - FLOOR_BOUNDS.topY) / (FLOOR_BOUNDS.middleY - FLOOR_BOUNDS.topY);
			width = FLOOR_BOUNDS.maxWidth * progress;
		} else {
			// Bottom half: contracting from middle to bottom
			const progress =
				(clampedY - FLOOR_BOUNDS.middleY) / (FLOOR_BOUNDS.bottomY - FLOOR_BOUNDS.middleY);
			width = FLOOR_BOUNDS.maxWidth * (1 - progress);
		}

		return {
			minX: -width / 2,
			maxX: width / 2
		};
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 */
	function snapToWall(x, y) {
		// Isometric walls: slanted parallelogram regions
		// Top and bottom boundaries are parallel to the wall slope
		// Left wall: from top (0, 0) to left-middle (-320, 150)
		// Right wall: from top (0, 0) to right-middle (320, 150)

		const WALL_OFFSET = 0;
		const WALL_HEIGHT = 250; // Vertical height of wall area
		const WALL_WIDTH = FLOOR_BOUNDS.maxWidth / 2; // Dynamic wall width based on floor bounds

		const isLeftWall = x < 0;

		// Wall slope: follows isometric perspective
		const WALL_SLOPE = FLOOR_BOUNDS.middleY / (FLOOR_BOUNDS.maxWidth / 2);

		if (isLeftWall) {
			const MIN_X = -WALL_WIDTH + 30; // 30px padding from edge
			const MAX_X = -WALL_OFFSET;
			const clampedX = Math.max(MIN_X, Math.min(MAX_X, x));

			// Calculate top and bottom Y boundaries based on X position (parallel slopes)
			// Top boundary: higher up as we go toward the center (less negative X)
			const topY = WALL_SLOPE * Math.abs(clampedX) - 280;
			// Bottom boundary: parallel to top, offset by wall height
			const bottomY = topY + WALL_HEIGHT;

			const clampedY = Math.max(topY, Math.min(bottomY, y));

			return { x: clampedX, y: clampedY, flipped: false };
		} else {
			const MIN_X = WALL_OFFSET;
			const MAX_X = WALL_WIDTH - 30; // 30px padding from edge
			const clampedX = Math.max(MIN_X, Math.min(MAX_X, x));

			// Calculate top and bottom Y boundaries based on X position (parallel slopes)
			// Top boundary: higher up as we go toward the center (less positive X)
			const topY = WALL_SLOPE * clampedX - 280;
			// Bottom boundary: parallel to top, offset by wall height
			const bottomY = topY + WALL_HEIGHT;

			const clampedY = Math.max(topY, Math.min(bottomY, y));

			return { x: clampedX, y: clampedY, flipped: true };
		}
	}

	// Function to handle egg selection (for clicks, not drag)
	/**
	 * @param {any} projectId
	 */
	function selectEggForClick(projectId) {
		if (!isEditingRoom) {
			const newSelection = selectedEggId === projectId ? null : projectId;

			// If external handler provided, use it
			if (onSelectProject) {
				onSelectProject(newSelection);
			} else {
				// Otherwise use local state
				localSelectedEggId = newSelection;
			}
		}
	}

	// Function to handle egg mouse down (for dragging in edit mode)
	/**
	 * @param {any} projectId
	 * @param {MouseEvent} e
	 */
	function selectEggForDrag(projectId, e) {
		if (isEditingRoom) {
			selectedEggForMove = projectId;
			handleEggMouseDown(projectId, e);
		}
	}

	// Function to handle project deletion
	/**
	 * @param {any} projectId
	 */
	function deleteProjectHandler(projectId) {
		// Remove the project from the list
		projectList = projectList.filter((project) => project.id !== projectId);
		// If the deleted project was selected, clear selection
		if (selectedEggId === projectId) {
			if (onSelectProject) {
				onSelectProject(null);
			} else {
				localSelectedEggId = null;
			}
		}
		// Call parent handler if provided
		if (onDeleteProject) {
			onDeleteProject(projectId);
		}
	}

	// Function to handle project shipping
	/**
	 * @param {any} project
	 */
	function handleShipProject(project) {
		// Call the original onShipProject function
		if (onShipProject) {
			onShipProject(project);
		}

		// The project will be automatically updated with the YSWS submission link
		// No need to manually mark it as shipped since it will be determined by the Airtable link
	}

	// Function to handle furniture selection (for clicks, not drag)
	/**
	 * @param {any} furnitureId
	 */
	function selectFurnitureForClick(furnitureId) {
		if (!isEditingRoom) {
			localSelectedFurnitureId = selectedFurnitureId === furnitureId ? null : furnitureId;
		}
	}

	// Function to handle furniture mouse down (for dragging in edit mode)
	/**
	 * @param {any} furnitureId
	 * @param {MouseEvent} e
	 */
	function selectFurnitureForDrag(furnitureId, e) {
		if (isEditingRoom) {
			selectedFurnitureForMove = furnitureId;
			handleFurnitureMouseDown(furnitureId, e);
		}
	}

	// Function to handle removing furniture from room (back to inventory)
	/**
	 * @param {any} furnitureId
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
				// Update local furniture list - mark as not placed
				const furnitureIndex = furnitureList.findIndex((f) => f.id === furnitureId);
				if (furnitureIndex !== -1) {
					furnitureList[furnitureIndex] = {
						...furnitureList[furnitureIndex],
						position: 'inventory',
						x: 0,
						y: 0,
						isPlaced: false,
						flipped: false
					};
					furnitureList = [...furnitureList]; // Trigger reactivity
				}

				// Clear selection
				if (selectedFurnitureId === furnitureId) {
					localSelectedFurnitureId = null;
				}
				if (selectedFurnitureForMove === furnitureId) {
					selectedFurnitureForMove = null;
				}
			} else {
				alert(`Failed to remove furniture: ${result.error}`);
			}
		} catch (error) {
			console.error('Error removing furniture:', error);
			alert('Failed to remove furniture. Please try again.');
		}
	}

	// Enter room editing mode
	function enterEditMode() {
		isEditingRoom = true;
		if (onSelectProject) {
			onSelectProject(null);
		} else {
			localSelectedEggId = null;
		}
		localSelectedFurnitureId = null;
		selectedEggForMove = null;
		selectedFurnitureForMove = null;
		// Store original positions
		originalPositions = projectList.map((project) => ({
			id: project.id,
			x: project.x,
			y: project.y
		}));
		originalFurniturePositions = furnitureList.map((furniture) => ({
			id: furniture.id,
			x: furniture.x,
			y: furniture.y
		}));
	}

	// Exit room editing mode (discard)
	function exitEditMode() {
		isEditingRoom = false;
		showFurnitureSidebar = false;
		selectedEggForMove = null;
		selectedFurnitureForMove = null;
		isDragging = false;
		isMouseDown = false;
		// Restore original positions
		if (originalPositions.length > 0) {
			projectList = projectList.map((project) => {
				const original = originalPositions.find((p) => p.id === project.id);
				if (original) {
					return { ...project, x: original.x, y: original.y };
				}
				return project;
			});
		}
		if (originalFurniturePositions.length > 0) {
			furnitureList = furnitureList.map((furniture) => {
				const original = originalFurniturePositions.find((f) => f.id === furniture.id);
				if (original) {
					return { ...furniture, x: original.x, y: original.y };
				}
				return furniture;
			});
		}
		originalPositions = [];
		originalFurniturePositions = [];
	}

	// Save room changes
	async function saveRoomChanges() {
		isSaving = true;
		try {
			const variantChanged = variant !== selectedVariant;
			// Only update projects that have actually changed position
			const changedProjects = projectList.filter((project) => {
				const original = originalPositions.find((p) => p.id === project.id);
				return original && (original.x !== project.x || original.y !== project.y);
			});

			// Only update furniture that have actually changed position
			const changedFurniture = furnitureList.filter((furniture) => {
				const original = originalFurniturePositions.find((f) => f.id === furniture.id);
				return original && (original.x !== furniture.x || original.y !== furniture.y);
			});

			if (changedProjects.length === 0 && changedFurniture.length === 0 && !variantChanged) {
				// No changes to save
				isEditingRoom = false;
				showFurnitureSidebar = false;
				selectedEggForMove = null;
				selectedFurnitureForMove = null;
				originalPositions = [];
				originalFurniturePositions = [];
				isSaving = false;
				return;
			}

			// Update all changed positions in parallel for better performance
			const updatePromises = [
				...changedProjects.map((project) =>
					fetch('/api/projects', {
						method: 'PUT',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							projectId: project.id,
							updates: {
								// Airtable stores position as a string "x,y,layer"
								position: `${Math.round(project.x)},${Math.round(project.y)},${project.layer || 0}`
							}
						})
					}).then((response) => {
						if (!response.ok) {
							throw new Error(`Failed to update project ${project.id}`);
						}
						return response.json();
					})
				),
				...changedFurniture.map((furniture) =>
					fetch('/api/furniture', {
						method: 'PUT',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							furnitureId: furniture.id,
							updates: {
								// Airtable stores position as a string "x,y,flipped,layer"
								position: `${Math.round(furniture.x)},${Math.round(furniture.y)},${furniture.flipped ? '1' : '0'},${furniture.layer || 0}`
							}
						})
					}).then((response) => {
						if (!response.ok) {
							throw new Error(`Failed to update furniture ${furniture.id}`);
						}
						return response.json();
					})
				)
			];

			if (variantChanged) {
				updatePromises.push(
					fetch('/api/update-profile', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							wallVariant: selectedVariant
						})
					}).then((response) => {
						if (!response.ok) {
							throw new Error('Failed to update room variant');
						}
						return response.json();
					})
				);
			}

			// Wait for all updates to complete
			await Promise.all(updatePromises);

			// Update the position string in projectList to match the saved x,y,layer values
			projectList = projectList.map((project) => ({
				...project,
				position: `${Math.round(project.x)},${Math.round(project.y)},${project.layer || 0}`
			}));

			// Update the position string in furnitureList to match the saved x,y,flipped,layer values
			furnitureList = furnitureList.map((furniture) => ({
				...furniture,
				position: `${Math.round(furniture.x)},${Math.round(furniture.y)},${furniture.flipped ? '1' : '0'},${furniture.layer || 0}`
			}));

			console.log(
				`Successfully saved ${changedProjects.length} project position(s) and ${changedFurniture.length} furniture position(s)`
			);

			// Exit edit mode
			isEditingRoom = false;
			showFurnitureSidebar = false;
			selectedEggForMove = null;
			selectedFurnitureForMove = null;
			originalPositions = [];
			originalFurniturePositions = [];

			// If variant was changed, reload to get fresh user data
			if (variantChanged) {
				window.location.reload();
			}
		} catch (error) {
			console.error('Error saving room changes:', error);
			alert('Failed to save room changes. Please try again.');
			// Keep edit mode open so user can retry
		} finally {
			isSaving = false;
		}
	}

	// Clamp value between min and max
	/**
	 * @param {number} value
	 * @param {number} min
	 * @param {number} max
	 */
	function clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	// Handle mouse move for dragging
	/**
	 * @param {MouseEvent} e
	 */
	function handleMouseMove(e) {
		// Handle sticky note preview
		if (isPlacingStickyNote) {
			handleStickyNotePreview(e);
			return;
		}

		if (!isMouseDown) return;

		// Start dragging if mouse is down and moves
		if (!isDragging) {
			isDragging = true;
		}

		// Get the room container to calculate relative position
		const roomElement = e.currentTarget;
		if (!(roomElement instanceof HTMLElement)) return;

		const rect = roomElement.getBoundingClientRect();

		// Calculate mouse position relative to room center
		const mouseX = e.clientX - rect.left - rect.width / 2;
		const mouseY = e.clientY - rect.top - rect.height / 2;

		// Calculate new position with offset
		let newX = mouseX - dragOffset.x;
		let newY = mouseY - dragOffset.y;

		// Find the project and update its position
		if (selectedEggForMove) {
			// Apply Y bounds first
			newY = clamp(newY, FLOOR_BOUNDS.topY, FLOOR_BOUNDS.bottomY);

			// Get allowed X range based on Y position (rhombus shape)
			const xRange = getAllowedXRange(newY);
			newX = clamp(newX, xRange.minX, xRange.maxX);

			const projectIndex = projectList.findIndex((p) => p.id === selectedEggForMove);
			if (projectIndex !== -1) {
				projectList[projectIndex] = {
					...projectList[projectIndex],
					x: newX,
					y: newY
				};
			}
		}

		// Find the furniture and update its position
		if (selectedFurnitureForMove) {
			const furnitureIndex = furnitureList.findIndex((f) => f.id === selectedFurnitureForMove);
			if (furnitureIndex !== -1) {
				const furniture = furnitureList[furnitureIndex];

				// Check if this furniture type is wall-only
				const furnitureType = FURNITURE_TYPES.find((ft) => ft.type === String(furniture.type));
				const isWallOnly = furnitureType?.wallOnly || false;

				// Apply wall constraint if needed
				if (isWallOnly) {
					// For wall-only furniture, don't apply normal floor bounds
					// Just snap directly to the wall and get the flip state
					const snapped = snapToWall(newX, newY);
					newX = snapped.x;
					newY = snapped.y;

					// Auto-flip based on which wall the furniture is on
					furnitureList[furnitureIndex] = {
						...furnitureList[furnitureIndex],
						x: newX,
						y: newY,
						flipped: snapped.flipped
					};
				} else {
					// Apply normal floor bounds for regular furniture
					newY = clamp(newY, FLOOR_BOUNDS.topY, FLOOR_BOUNDS.bottomY);
					const xRange = getAllowedXRange(newY);
					newX = clamp(newX, xRange.minX, xRange.maxX);

					furnitureList[furnitureIndex] = {
						...furnitureList[furnitureIndex],
						x: newX,
						y: newY
					};
				}
			}
		}
	}

	// Handle mouse down on egg to prepare for dragging
	/**
	 * @param {any} projectId
	 * @param {MouseEvent} e
	 */
	function handleEggMouseDown(projectId, e) {
		if (!isEditingRoom) return;

		e.preventDefault(); // Prevent text selection while dragging

		const project = projectList.find((p) => p.id === projectId);
		if (!project) return;

		// Get the room container - traverse up to find it
		let roomElement = e.target;
		while (
			roomElement &&
			!(roomElement instanceof HTMLElement && roomElement.classList.contains('room'))
		) {
			roomElement = /** @type {HTMLElement} */ (roomElement).parentElement;
		}

		if (!roomElement) return;

		const rect = roomElement.getBoundingClientRect();

		// Calculate mouse position relative to room center
		const mouseX = e.clientX - rect.left - rect.width / 2;
		const mouseY = e.clientY - rect.top - rect.height / 2;

		// Store the offset between mouse position and egg position
		dragOffset = {
			x: mouseX - project.x,
			y: mouseY - project.y
		};

		dragStartPos = { x: mouseX, y: mouseY };
		selectedEggForMove = projectId;
		selectedFurnitureForMove = null; // Deselect furniture when selecting egg
		isMouseDown = true;
		// Don't set isDragging yet - that happens in handleMouseMove
	}

	// Handle mouse down on furniture to prepare for dragging
	/**
	 * @param {any} furnitureId
	 * @param {MouseEvent} e
	 */
	function handleFurnitureMouseDown(furnitureId, e) {
		if (!isEditingRoom) return;

		e.preventDefault(); // Prevent text selection while dragging

		const furniture = furnitureList.find((f) => f.id === furnitureId);
		if (!furniture) return;

		// Get the room container - traverse up to find it
		let roomElement = e.target;
		while (
			roomElement &&
			!(roomElement instanceof HTMLElement && roomElement.classList.contains('room'))
		) {
			roomElement = /** @type {HTMLElement} */ (roomElement).parentElement;
		}

		if (!roomElement) return;

		const rect = roomElement.getBoundingClientRect();

		// Calculate mouse position relative to room center
		const mouseX = e.clientX - rect.left - rect.width / 2;
		const mouseY = e.clientY - rect.top - rect.height / 2;

		// Store the offset between mouse position and furniture position
		dragOffset = {
			x: mouseX - furniture.x,
			y: mouseY - furniture.y
		};

		dragStartPos = { x: mouseX, y: mouseY };
		selectedFurnitureForMove = furnitureId;
		selectedEggForMove = null; // Deselect egg when selecting furniture
		isMouseDown = true;
		// Don't set isDragging yet - that happens in handleMouseMove
	}

	// Handle mouse down to start dragging (from room background)
	/**
	 * @param {MouseEvent} e
	 */
	function handleMouseDown(e) {
		// Only handle if we're in edit mode and NOT clicking on an egg or furniture
		if (!isEditingRoom) return;

		// Deselect if clicking on background
		if (
			e.target === e.currentTarget ||
			(e.target instanceof HTMLElement && e.target.classList.contains('room-bg'))
		) {
			selectedEggForMove = null;
			selectedFurnitureForMove = null;
			isDragging = false;
		}
	}

	// Handle mouse up to stop dragging
	function handleMouseUp() {
		isMouseDown = false;
		isDragging = false;
	}

	// Handle furniture list updates from room editor
	/**
	 * @param {any[]} updatedFurnitureList
	 */
	function handleFurnitureUpdate(updatedFurnitureList) {
		furnitureList = updatedFurnitureList;
	}

	let stickyNotePreviewPos = $state({ x: 0, y: 0, flipped: false });
	/** @type {any[]} */
	let notifications = $state([]);

	$effect(() => {
		fetch('/api/get-user-notifications')
			.then((res) => res.json())
			.then((data) => {
				notifications = data.notifications;
			})
			.catch((err) => {
				console.error('Failed to fetch notifications:', err);
				notifications = [];
			});
	});

	function startPlacingStickyNote() {
		isPlacingStickyNote = true;
	}

	function cancelPlacingStickyNote() {
		isPlacingStickyNote = false;
		isPlacingStickyNoteLoading = false;
	}

	/**
	 * @param {MouseEvent} e
	 */
	function handleStickyNotePreview(e) {
		if (!isPlacingStickyNote || isPlacingStickyNoteLoading) return;

		const roomElement = e.currentTarget;
		if (!(roomElement instanceof HTMLElement)) return;

		const rect = roomElement.getBoundingClientRect();
		const mouseX = e.clientX - rect.left - rect.width / 2;
		const mouseY = e.clientY - rect.top - rect.height / 2;

		// Snap to wall for sticky note placement
		const snapped = snapToWall(mouseX, mouseY);
		stickyNotePreviewPos = snapped;
	}

	/**
	 * @param {MouseEvent} e
	 */
	async function placeStickyNote(e) {
		if (!isPlacingStickyNote || isPlacingStickyNoteLoading) return;

		e.stopPropagation();

		isPlacingStickyNoteLoading = true;

		try {
			const response = await fetch('/api/place-sticky-note', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					targetUsername: user.username,
					x: stickyNotePreviewPos.x,
					y: stickyNotePreviewPos.y,
					flipped: stickyNotePreviewPos.flipped
				})
			});

			const result = await response.json();

			if (result.success) {
				if (result.shouldOpenEditor && result.furniture.id) {
					sessionStorage.setItem('autoOpenStickyNote', result.furniture.id);
				}

				// Preserve skipNotification parameter to prevent duplicate profile view notifications
				if (typeof window !== 'undefined') {
					const url = new URL(window.location.href);
					if (!url.searchParams.has('skipNotification')) {
						url.searchParams.set('skipNotification', 'true');
						window.location.href = url.toString();
					} else {
						location.reload();
					}
				}
			} else {
				isPlacingStickyNoteLoading = false;
				isPlacingStickyNote = false;
				alert(`Failed to place sticky note: ${result.error}`);
			}
		} catch (error) {
			isPlacingStickyNoteLoading = false;
			isPlacingStickyNote = false;
			console.error('Error placing sticky note:', error);
			alert('Failed to place sticky note. Please try again.');
		}
	}
</script>

<svelte:window onmouseup={handleMouseUp} />

<div
	class="zlayer room {isEditingRoom ? 'editing' : ''} {isDragging
		? 'dragging'
		: ''} {showFurnitureSidebar ? 'sidebar-open' : ''} {isPlacingStickyNote
		? 'placing-sticky-note'
		: ''}"
	onclick={(e) => {
		if (isPlacingStickyNote) {
			placeStickyNote(e);
			return;
		}
		if (!isEditingRoom) {
			if (onSelectProject) {
				onSelectProject(null);
			} else {
				localSelectedEggId = null;
			}
			localSelectedFurnitureId = null;
		}
	}}
	onmousemove={handleMouseMove}
	onmousedown={handleMouseDown}
	role="presentation"
>
	{#key selectedVariant}
		<img
			aria-hidden="true"
			class="room-bg variant-transition"
			src="/room/walls/room_{selectedVariant}.png?v={Date.now()}"
			alt="Room background - {selectedVariant}"
			onerror={(e) => {
				console.error('Failed to load wall variant:', selectedVariant, e);
				// Fallback to default if image fails
				if (selectedVariant !== 'default') {
					selectedVariant = 'default';
				}
			}}
			onload={() => {
				console.log('Successfully loaded variant:', selectedVariant);
			}}
		/>
	{/key}

	<FloorTile></FloorTile>

	{#if (!projectList || projectList.length === 0) && !readOnly}
		<button
			class="new-project"
			onclick={(e) => {
				e.stopPropagation();
				isCreateOpen = !isCreateOpen;
			}}>you don't have any projects yet. create something new?</button
		>
	{/if}

	{#each projectList as project, index}
		<ProjectEgg
			bind:projInfo={projectList[index]}
			x={project.x}
			y={project.y}
			selected={isEditingRoom ? selectedEggForMove === project.id : selectedEggId === project.id}
			onSelect={() => selectEggForClick(project.id)}
			onMouseDown={(/** @type {MouseEvent} */ e) => selectEggForDrag(project.id, e)}
			{onShowPromptPopup}
			onDelete={deleteProjectHandler}
			{onOpenRouletteSpin}
			onShipProject={handleShipProject}
			{onPaintChipsClaimed}
			{user}
			isRoomEditing={isEditingRoom}
			{readOnly}
			bind:this={projectEggRefs[index]}
		/>
	{/each}

	{#each furnitureList.filter((f) => f.isPlaced) as furniture, index}
		<FurnitureItem
			bind:furnitureInfo={furnitureList[furnitureList.findIndex((f) => f.id === furniture.id)]}
			x={furniture.x}
			y={furniture.y}
			selected={isEditingRoom
				? selectedFurnitureForMove === furniture.id
				: selectedFurnitureId === furniture.id}
			onSelect={() => selectFurnitureForClick(furniture.id)}
			onMouseDown={(/** @type {MouseEvent} */ e) => selectFurnitureForDrag(furniture.id, e)}
			onRemoveFromRoom={removeFurnitureFromRoom}
			isRoomEditing={isEditingRoom}
			isInteractable={FURNITURE_TYPES.find((f) => f.type === String(furniture.type))
				?.isInteractable || false}
			furnitureComponent={FURNITURE_TYPES.find((f) => f.type === String(furniture.type))
				?.component || null}
			showFurnitureSidebar={(/** @type {boolean} */ v) => (showFurnitureSidebar = v)}
			data={furnitureList[furnitureList.findIndex((f) => f.id === furniture.id)].data}
			wallOnly={FURNITURE_TYPES.find((f) => f.type === String(furniture.type))?.wallOnly || false}
			{readOnly}
			roomOwner={user}
			{currentUser}
		/>
	{/each}

	<!-- Sticky Note Preview -->
	{#if isPlacingStickyNote}
		<div
			class="sticky-note-preview {isPlacingStickyNoteLoading ? 'loading' : ''}"
			style:--x={stickyNotePreviewPos.x}
			style:--y={stickyNotePreviewPos.y}
			style:--z={Math.round(stickyNotePreviewPos.y)}
		>
			<img
				class="sticky-note-preview-img {stickyNotePreviewPos.flipped ? 'css-flipped' : ''}"
				src="/landing/stickynote.png"
				alt="Sticky note preview"
			/>
			{#if isPlacingStickyNoteLoading}
				<div class="loading-spinner">⏳</div>
			{/if}
		</div>
	{/if}

	{#if !hideControls}
		{#if !isEditingRoom && !isPlacingStickyNote}
			<div
				class="fab-container"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="presentation"
			>
				{#if !readOnly}
					<ExpandableButton
						icon="+"
						expandedText="create new project"
						expandedWidth="165px"
						onClick={() => {
							isCreateOpen = !isCreateOpen;
						}}
					/>

					<ExpandableButton
						icon="✎"
						expandedText="edit room"
						expandedWidth="112px"
						onClick={() => {
							enterEditMode();
							showFurnitureSidebar = true;
						}}
					/>
				{:else if currentUser && currentUser.username !== user.username}
					<ExpandableButton
						icon="📝"
						expandedText="place sticky note"
						expandedWidth="165px"
						onClick={startPlacingStickyNote}
					/>
				{/if}
			</div>
		{:else if isPlacingStickyNote}
			<div
				class="edit-mode-controls"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="presentation"
			>
				<p>
					{isPlacingStickyNoteLoading ? 'placing sticky note...' : 'click to place sticky note →'}
				</p>
				<button
					class="edit-mode-btn discard-edit-btn"
					onclick={cancelPlacingStickyNote}
					disabled={isPlacingStickyNoteLoading}
				>
					<span class="btn-text">cancel 🗑️</span>
				</button>
			</div>
		{:else if isEditingRoom}
			<div
				class="edit-mode-controls"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="presentation"
			>
				<RoomVariantSelector
					bind:selectedVariant
					disabled={isSaving}
					variants={[
						{ id: 'default', label: 'default', preview: '/room/walls/room_default.png' },
						{ id: 'pink', label: 'pink', preview: '/room/walls/room_pink.png' },
						{ id: 'clouds', label: 'clouds', preview: '/room/walls/room_clouds.png' },
						{ id: 'mimo', label: 'mimo', preview: '/room/walls/room_mimo.png' },
						{ id: 'glitched', label: 'glitched', preview: '/room/walls/room_glitched.png' },
						{ id: 'gradient', label: 'gradient', preview: '/room/walls/room_gradient.png' }
					]}
				/>
				<p>editing your room →</p>
				<button class="edit-mode-btn discard-edit-btn" onclick={exitEditMode} disabled={isSaving}>
					<span class="btn-text">discard 🗑️</span>
				</button>
				<button class="edit-mode-btn save-edit-btn" onclick={saveRoomChanges} disabled={isSaving}>
					<span class="btn-text">{isSaving ? 'saving...' : 'save'} 💾</span>
				</button>
			</div>
		{/if}
	{/if}
</div>

{#if devlogs}
<div class="devlogs">
	<Devlogs {devlogs} username={user?.username} {currentUser} />
</div>
{/if}
{#if notifications && notifications.length > 0}
<div class="notifications">
	<Notifications {notifications} />
</div>
{/if}

<style>
	.zlayer {
		position: absolute;
		top: 0;
		left: 0;
	}

	.room {
		z-index: 1;
		height: 100%;
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		position: absolute;
		transition: transform 0.3s ease;
	}

	.room.sidebar-open {
		transform: translateX(-150px);
	}

	@media (max-width: 768px) {
		.room.sidebar-open {
			transform: translateX(0);
		}
	}

	.room-bg {
		position: absolute;
		height: 700px;
		pointer-events: none;
		-webkit-user-select: none; /* Safari */
		-moz-user-select: none; /* Firefox */
		-ms-user-select: none; /* IE10+/Edge */
		user-select: none; /* Standard */
	}

	.variant-transition {
		animation: fadeIn 0.4s ease-in-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.room .new-project {
		position: absolute;

		background-color: #ffffffaa;
		border: 4px solid white;
		border-radius: 8px;

		width: 300px;
		text-align: center;
		padding: 10px 20px;
		transition: 0.2s;
		pointer-events: all;
		cursor: pointer;
		font-family: inherit;
		font-size: inherit;
	}

	.room .new-project:hover {
		background-color: white;
	}

	.fab-container {
		position: absolute;
		bottom: calc(50vh - 150px);
		left: calc(50vw - 350px);
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.room.editing {
		cursor: crosshair;
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
	}

	.room.dragging {
		cursor: grabbing !important;
	}

	.room.dragging * {
		cursor: grabbing !important;
	}

	.edit-mode-controls {
		position: absolute;
		bottom: calc(50vh - 150px);
		left: calc(50vw - 310px);
		transform: translateX(-100%);
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 16px;
		align-items: flex-end;
	}

	.edit-mode-controls > p {
		margin-bottom: 4px;
		color: white;
	}

	.edit-mode-btn {
		display: flex;
		flex-flow: row;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;

		background-color: #ffffff25;
		border: 2px solid white;
		border-radius: 30px;

		height: 40px;
		padding-right: 11px;
		padding-left: 16px;

		font-family: inherit;
		font-size: 0.8em;
		color: white;
		cursor: pointer;

		transition: all 0.3s ease;
		white-space: nowrap;
	}

	.edit-mode-btn:hover:not(:disabled) {
		background-color: white;
		color: black;
	}

	.edit-mode-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.edit-mode-btn .btn-text {
		white-space: nowrap;
	}

	.notifications {
		position: absolute;
		bottom: calc(50vh - 150px);
		left: calc(50vw - 630px);
		right: auto;
		z-index: 100;
	}

	.devlogs {
		position: absolute;
		bottom: calc(50vh - 150px);
		right: calc(50vw - 630px);
		z-index: 0;
	}

	@media (max-width: 1400px) {
		.notifications {
			left: 20px;
			right: auto;
		}
		.devlogs {
			right: 20px;
			left: auto;
		}
	}

	.sticky-note-preview {
		position: absolute;
		z-index: 500; /* High z-index to always appear on top */
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: column;
		gap: 8px;
		transform: translate(calc(var(--x) * 1px), calc(var(--y) * 1px));
		pointer-events: none;
		opacity: 0.7;
		transition:
			opacity 0.2s,
			transform 0.1s;
	}

	.sticky-note-preview.loading {
		opacity: 1;
		transform: translate(calc(var(--x) * 1px), calc(var(--y) * 1px)) scale(1.1);
	}

	.sticky-note-preview-img {
		width: 80px;
		height: auto;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
	}

	.sticky-note-preview.loading .sticky-note-preview-img {
		animation: pulse 0.8s ease-in-out infinite;
		filter: drop-shadow(0 4px 8px rgba(255, 215, 0, 0.5));
	}

	.sticky-note-preview-img.css-flipped {
		transform: scaleX(-1);
	}

	.loading-spinner {
		font-size: 32px;
		animation: spin 1.5s linear infinite;
		pointer-events: none;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.room.placing-sticky-note {
		cursor: crosshair;
	}
</style>
