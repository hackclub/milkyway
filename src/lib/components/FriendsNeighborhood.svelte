<script>
	import Room from './room/Room.svelte';
	import { FURNITURE_CATALOG } from '$lib/furniture-catalog.js';

	let {
		friendsRooms = [],
		loadingFriends = false,
		userRoom,
		userName,
		selectedProjectId = $bindable(null),
		onSelectProject,
		currentUserId = null
	} = $props();

	// Derive a reactive computed value to ensure updates
	let showRooms = $derived(!loadingFriends && friendsRooms.length > 0);

	/**
	 * Filter furniture to hide owner-only items when viewing another user's room
	 * @param {any} friend - The friend's room data
	 * @returns {any[]} - Filtered furniture list
	 */
	function getVisibleFurniture(friend) {
		// Show all furniture if viewing own room
		if (currentUserId && friend.id === currentUserId) {
			return friend.furniture || [];
		}
		// Otherwise, hide owner-only furniture
		return (friend.furniture || []).filter((/** @type {any} */ furniture) => {
			const furnitureType = FURNITURE_CATALOG[furniture.type];
			return !furnitureType?.ownerOnly;
		});
	}

	// Pan state
	let isPanning = $state(false);
	let panOffset = $state({ x: 0, y: 0 });
	let panStart = $state({ x: 0, y: 0 });

	// Hover dropdown state
	let hoveredFriendIndex = $state(/** @type {number | null} */ (null));
	let dropdownPosition = $state({ x: 0, y: 0 });

	/**
	 * Pan handlers for navigation
	 */
	function handlePanStart(/** @type {MouseEvent} */ e) {
		// Don't start panning if clicking on a project egg
		if (e.target instanceof Element && e.target.closest('.project-egg')) {
			return;
		}

		e.preventDefault();
		isPanning = true;
		panStart = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
	}

	function handlePanMove(/** @type {MouseEvent} */ e) {
		if (!isPanning) return;
		panOffset = {
			x: e.clientX - panStart.x,
			y: e.clientY - panStart.y
		};
	}

	function handlePanEnd() {
		isPanning = false;
	}

	/**
	 * Handle hover on friend name
	 * @param {number} index
	 * @param {MouseEvent} e
	 */
	function handleFriendNameHover(index, e) {
		if (isPanning) return;
		hoveredFriendIndex = index;
		const target = e.currentTarget;
		if (target instanceof HTMLElement) {
			const rect = target.getBoundingClientRect();
			dropdownPosition = {
				x: rect.left + rect.width / 2,
				y: rect.bottom + 5
			};
		}
	}

	/**
	 * Handle mouse leave from friend name
	 */
	function handleFriendNameLeave() {
		// Use a small delay to allow clicking on dropdown
		setTimeout(() => {
			if (hoveredFriendIndex !== null && !document.querySelector('.friend-dropdown:hover')) {
				hoveredFriendIndex = null;
			}
		}, 100);
	}

	/**
	 * Navigate to user profile
	 * @param {string} username
	 */
	function viewUserProfile(username) {
		window.location.href = `/u/${username}`;
	}

	/**
	 * Follow/unfollow a user
	 * @param {string} userId
	 * @param {boolean} isFollowing
	 */
	async function toggleFollow(userId, isFollowing) {
		try {
			const response = await fetch('/api/follow', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId, action: isFollowing ? 'unfollow' : 'follow' })
			});

			if (response.ok) {
				const result = await response.json();
				// Update the local state
				const friendIndex = friendsRooms.findIndex((f) => f.id === userId);
				if (friendIndex !== -1) {
					// Create a new array to trigger reactivity
					friendsRooms = friendsRooms.map((friend, idx) =>
						idx === friendIndex ? { ...friend, isFollowing: result.isFollowing } : friend
					);
				}
			}
		} catch (error) {
			console.error('Error toggling follow:', error);
		}
		hoveredFriendIndex = null;
	}
</script>

<svelte:window onmouseup={handlePanEnd} onmousemove={handlePanMove} />

<!-- Pan overlay during active panning -->
{#if isPanning}
	<div class="pan-overlay-active" role="presentation"></div>
{/if}

<!-- Rooms container with zoom and pan -->
<div
	class="rooms-container"
	class:panning={isPanning}
	style:transform="scale(0.5) translate({panOffset.x}px, {panOffset.y}px)"
	onmousedown={handlePanStart}
	role="presentation"
>
	<!-- User's room in the center -->
	<div class="room-wrapper center-room">
		<Room
			{...userRoom}
			{selectedProjectId}
			{onSelectProject}
			hideControls={true}
			readOnly={false}
		/>
		<div
			class="room-label hoverable"
			onclick={(e) => {
				e.stopPropagation();
				viewUserProfile(userName);
			}}
			onmousedown={(e) => e.stopPropagation()}
			role="button"
			tabindex="0"
		>
			{userName} (you)
		</div>
	</div>

	<!-- Friends' rooms in hexagonal pattern -->
	{#each friendsRooms as friend, index (friend.id)}
		<div class="room-wrapper friend-room friend-room-{index}" class:loading={!showRooms}>
			{#if showRooms}
				{#if friend.projects && friend.projects.length > 0}
					<Room
						projectList={friend.projects}
						furnitureList={getVisibleFurniture(friend)}
						user={friend}
						variant={friend.wallVariant || 'default'}
						onShowPromptPopup={() => {}}
						onOpenRouletteSpin={() => {}}
						onDeleteProject={() => {}}
						readOnly={true}
						hideControls={true}
						{selectedProjectId}
						{onSelectProject}
					/>
				{:else}
					<div class="room-placeholder">
						<div class="placeholder-room-bg"></div>
					</div>
				{/if}
			{:else}
				<!-- Loading placeholder -->
				<div class="room-placeholder">
					<div class="placeholder-room-bg"></div>
				</div>
			{/if}
			<div
				class="room-label"
				class:loading={!showRooms}
				class:hoverable={showRooms}
				onmouseenter={(e) => showRooms && handleFriendNameHover(index, e)}
				onmouseleave={handleFriendNameLeave}
				onmousedown={(e) => e.stopPropagation()}
				role="button"
				tabindex="0"
			>
				{#if friend.isFollowing}
					<span class="following-star">💫</span>
				{/if}
				{friend.username}
			</div>
		</div>
	{/each}
</div>

<!-- Dropdown menu - OUTSIDE the scaled container so clicks work -->
{#if hoveredFriendIndex !== null && showRooms}
	{@const friend = friendsRooms[hoveredFriendIndex]}
	<div
		class="friend-dropdown"
		style:left="{dropdownPosition.x}px"
		style:top="{dropdownPosition.y}px"
		onmouseenter={() => {}}
		onmouseleave={handleFriendNameLeave}
		role="menu"
		tabindex="-1"
	>
		<button class="dropdown-item" onclick={() => viewUserProfile(friend.username)} role="menuitem">
			View Profile
		</button>
		<button
			class="dropdown-item"
			onclick={() => toggleFollow(friend.id, friend.isFollowing || false)}
			role="menuitem"
		>
			{friend.isFollowing ? 'Unfollow' : 'Follow'}
		</button>
	</div>
{/if}

<style>
	/* Rooms container with zoom effect */
	.rooms-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		transition: transform 0.6s ease;
		cursor: grab;
	}

	.rooms-container.panning {
		cursor: grabbing;
		transition: none;
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
	}

	/* Disable all interactions when panning */
	.rooms-container.panning * {
		user-select: none !important;
		-webkit-user-select: none !important;
		-moz-user-select: none !important;
		-ms-user-select: none !important;
		pointer-events: none !important;
	}

	/* Enable interactions with project eggs (except when panning) */
	.rooms-container :global(.project-egg),
	.rooms-container :global(.project-egg *),
	.rooms-container :global(.project-egg .egg-svg) {
		pointer-events: auto !important;
	}

	.rooms-container :global(.project-egg .project-info) {
		pointer-events: auto !important;
		z-index: 9999 !important;
	}

	/* Disable project eggs when actively panning */
	.rooms-container.panning :global(.project-egg),
	.rooms-container.panning :global(.project-egg *) {
		pointer-events: none !important;
	}

	/* Pan overlay during active panning */
	.pan-overlay-active {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: 9999;
		cursor: grabbing;
		pointer-events: auto;
	}

	/* Room wrappers */
	.room-wrapper {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		transition: all 0.6s ease;
		z-index: 1;
	}

	/* Disable pointer events on room backgrounds (allows panning) */
	.room-wrapper {
		pointer-events: none;
	}

	/* Re-enable pointer events on project eggs */
	.room-wrapper :global(.project-egg),
	.room-wrapper :global(.project-egg *) {
		pointer-events: auto;
	}

	/* Bring room with selected project to front */
	.room-wrapper:has(:global(.project-egg.selected)) {
		z-index: 5000 !important;
	}

	.center-room {
		transform: translate(0, 0);
		view-transition-name: user-room;
	}

	/* Friend room positions in hexagonal pattern */
	.friend-room-0 {
		transform: translate(-600px, 0);
	}
	.friend-room-1 {
		transform: translate(-300px, -540px);
	}
	.friend-room-2 {
		transform: translate(300px, -540px);
	}
	.friend-room-3 {
		transform: translate(600px, 0);
	}
	.friend-room-4 {
		transform: translate(300px, 540px);
	}
	.friend-room-5 {
		transform: translate(-300px, 540px);
	}

	/* Room labels */
	.room-label {
		position: absolute;
		top: 250px;
		left: 50%;
		transform: translateX(-50%);
		background-color: rgba(251, 242, 191, 0.95);
		border: 3px solid #f7c881;
		border-radius: 8px;
		padding: 12px 24px;
		font-size: 1.8em;
		font-weight: bold;
		color: #333;
		white-space: nowrap;
		z-index: 10;
		pointer-events: none;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.room-label.hoverable {
		pointer-events: auto;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.room-label.hoverable:hover {
		background-color: rgba(255, 248, 220, 1);
		border-color: #f5b041;
		transform: translateX(-50%) scale(1.05);
	}

	.following-star {
		font-size: 0.8em;
		animation: sparkle 2s ease-in-out infinite;
	}

	@keyframes sparkle {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.7;
			transform: scale(1.1);
		}
	}

	/* Dropdown menu */
	.friend-dropdown {
		position: fixed;
		transform: translateX(-50%);
		background-color: rgba(255, 255, 255, 0.95);
		border: 3px solid #f7c881;
		border-radius: 8px;
		overflow: hidden;
		z-index: 10000;
		pointer-events: auto !important;
		min-width: 150px;
	}

	.dropdown-item {
		display: block;
		width: 100%;
		padding: 10px 16px;
		background: transparent;
		border: none;
		text-align: left;
		font-family: inherit;
		font-size: 1em;
		font-weight: 600;
		color: #333;
		cursor: pointer;
		transition: background-color 0.2s ease;
		pointer-events: auto !important;
	}

	.dropdown-item:hover {
		background-color: rgba(251, 242, 191, 0.6);
	}

	.dropdown-item:not(:last-child) {
		border-bottom: 1px solid rgba(247, 200, 129, 0.3);
	}

	/* Loading placeholders */
	.room-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.placeholder-room-bg {
		width: 700px;
		height: 700px;
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.1) 0%,
			rgba(255, 255, 255, 0.05) 100%
		);
		border-radius: 50%;
		animation: pulse 2s ease-in-out infinite;
		position: relative;
	}

	.placeholder-room-bg::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 400px;
		height: 300px;
		background: rgba(255, 255, 255, 0.15);
		clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
		animation: pulse 2s ease-in-out infinite 0.5s;
	}

	.room-label.loading {
		opacity: 0.6;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 0.6;
		}
	}
</style>
