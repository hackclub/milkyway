<script>
	import Room from '$lib/components/room/Room.svelte';
	import ReportUserModal from '$lib/components/ReportUserModal.svelte';
	import { FURNITURE_CATALOG } from '$lib/furniture-catalog.js';
	import { onMount } from 'svelte';

	let { data } = $props();

	/** @type {any[]} */
	let projectList = $state(data.projects || []);
	/** @type {any[]} */
	let furnitureList = $state(data.furniture || []);
	let isFollowing = $state(data.isFollowing || false);
	let followLoading = $state(false);
	let loading = $state(false);
	let userData = $state(data.user);
	let showReportModal = $state(false);
	let stellarShipProjectIds = $state(new Set(data.stellarShipProjectIds || []));

	// Filter furniture to hide owner-only items when viewing another user's profile
	let filteredFurnitureList = $derived(
		furnitureList.filter((furniture) => {
			const furnitureType = FURNITURE_CATALOG[furniture.type];
			// If ownerOnly is true and we're viewing someone else's profile, hide it
			if (furnitureType?.ownerOnly && data.currentUser?.recId !== userData?.recId) {
				return false;
			}
			return true;
		})
	);

	// Track profile views to prevent duplicate notifications
	onMount(() => {
		if (typeof window !== 'undefined' && userData) {
			const viewKey = `profileView_${userData.username}`;
			const hasViewed = sessionStorage.getItem(viewKey);

			if (!hasViewed) {
				// Mark as viewed for this session
				sessionStorage.setItem(viewKey, 'true');
			} else {
				// Already viewed in this session, update URL to skip notification on future reloads
				const url = new URL(window.location.href);
				if (!url.searchParams.has('skipNotification')) {
					url.searchParams.set('skipNotification', 'true');
					window.history.replaceState({}, '', url.toString());
				}
			}
		}
	});

	// Calculate total hours and project count
	let totalHours = $derived(
		Number(
			projectList.reduce(
				(/** @type {number} */ sum, /** @type {any} */ project) =>
					sum + ((project.hackatimeHours || 0) + (project.artHours || 0)),
				0
			)
		)
	);
	let projectCount = $derived(projectList.length);

	/**
	 * Toggle follow/unfollow or redirect to sign in
	 */
	async function handleFollowClick() {
		if (!data.isLoggedIn) {
			// Redirect to landing page for sign in
			window.location.href = '/';
			return;
		}

		followLoading = true;
		try {
			const response = await fetch('/api/follow', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: userData?.recId,
					action: isFollowing ? 'unfollow' : 'follow'
				})
			});

			if (response.ok) {
				const result = await response.json();
				const wasFollowing = isFollowing;
				isFollowing = result.isFollowing;

				// Update follower count immediately (only if data has loaded)
				if (
					!loading &&
					userData &&
					userData.followerCount !== undefined &&
					userData.followerCount !== null
				) {
					userData.followerCount +=
						result.isFollowing && !wasFollowing ? 1 : !result.isFollowing && wasFollowing ? -1 : 0;
				}
			} else {
				alert('Failed to update follow status');
			}
		} catch (error) {
			console.error('Error toggling follow:', error);
			alert('Failed to update follow status');
		} finally {
			followLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{userData?.username || 'User'}'s Room ✦ Milkyway</title>
</svelte:head>

<main>
	{#if !userData}
		<div class="error-message">User not found</div>
	{:else}
		<!-- User Info Header -->
		<div class="user-info-header">
			<div class="user-info-content">
				<h1 class="username">{userData.username}'s Room</h1>
				<div class="stats" class:loading>
					<div class="stat-item">
						<img src="/coin.png" alt="Coins" class="stat-icon" />
						<span>{userData.coins || 0}</span>
					</div>
					<div class="stat-item">
						<img src="/stellarship.png" alt="Stellarships" class="stat-icon" />
						<span>{userData.stellarships || 0}</span>
					</div>
					<div class="stat-item">
						<img src="/paintchip.png" alt="Paint Chips" class="stat-icon" />
						<span>{userData.paintchips || 0}</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Projects:</span>
						<span>{loading ? '...' : projectCount}</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Hours:</span>
						<span>{loading ? '...' : totalHours.toFixed(1)}</span>
					</div>
				</div>

				<div class="social-stats" class:loading>
					<div class="social-item">
						<span class="social-count">{loading ? '...' : userData.followerCount || 0}</span>
						<span class="social-label">Followers</span>
					</div>
					<div class="social-divider"></div>
					<div class="social-item">
						<span class="social-count">{loading ? '...' : userData.followingCount || 0}</span>
						<span class="social-label">Following</span>
					</div>
				</div>
				{#if !data.isLoggedIn || (data.isLoggedIn && data.currentUser?.username !== userData.username)}
					<div class="action-buttons">
						<button
							class="follow-button"
							class:following={isFollowing}
							class:sign-in-button={!data.isLoggedIn}
							disabled={followLoading || loading}
							onclick={handleFollowClick}
						>
							{#if !data.isLoggedIn}
								Sign in to follow
							{:else}
								{followLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
							{/if}
						</button>
						{#if data.isLoggedIn}
							<button class="report-button" onclick={() => (showReportModal = true)} title="Report">
								Report
							</button>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- User's Room -->
		<div class="user-room">
			<Room
				bind:projectList
				bind:furnitureList={filteredFurnitureList}
				user={userData}
				currentUser={data.currentUser}
				onShowPromptPopup={() => {}}
				onOpenRouletteSpin={() => {}}
				onDeleteProject={() => {}}
				onShipProject={() => {}}
				readOnly={true}
				hideControls={false}
				variant={userData.wallVariant}
				{stellarShipProjectIds}
			/>
		</div>

		<!-- Back button -->
		<div class="back-button-container">
			<a href={data.isLoggedIn ? '/home' : '/'} class="back-button">
				<span>← back to {data.isLoggedIn ? 'home' : 'landing'}</span>
			</a>
		</div>
	{/if}
</main>

{#if showReportModal && userData}
	<ReportUserModal
		targetUserId={userData.recId}
		targetUsername={userData.username}
		onClose={() => (showReportModal = false)}
	/>
{/if}

<style>
	main {
		background-image: url('/milkyway bg.png');
		background-size: cover;
		background-position: center;
		height: 100vh;
		width: 100vw;
		box-sizing: border-box;
		position: fixed;
		top: 0;
		left: 0;
		overflow: hidden;
	}

	.user-info-header {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), transparent);
		padding: 20px;
		z-index: 100;
		pointer-events: none;
	}

	.user-info-content {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: center;
		pointer-events: auto;
	}

	.username {
		font-size: 2em;
		font-weight: bold;
		color: white;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
		margin: 0;
	}

	.stats {
		display: flex;
		gap: 20px;
		align-items: center;
		background: var(--yellow);
		padding: 10px 20px;
		border-radius: 8px;
		border: 2px solid #f7c881;
	}

	.stat-item {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 1.1em;
		font-weight: 600;
		color: #333;
	}

	.stat-icon {
		width: 24px;
		height: 24px;
		object-fit: contain;
	}

	.stat-label {
		color: #666;
		font-weight: 500;
	}

	.follow-button {
		padding: 10px 24px;
		background-color: #4caf50;
		color: white;
		border: none;
		border-radius: 8px;
		font-family: inherit;
		font-size: 1em;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.follow-button:hover {
		background-color: #45a049;
		transform: scale(1.05);
	}

	.follow-button.following {
		background-color: #f44336;
	}

	.follow-button.following:hover {
		background-color: #da190b;
	}

	.follow-button.sign-in-button {
		background-color: #2196f3;
	}

	.follow-button.sign-in-button:hover {
		background-color: #0b7dda;
	}

	.follow-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.report-button {
		padding: 10px 20px;
		background-color: #ff9800;
		color: white;
		border: none;
		border-radius: 8px;
		font-family: inherit;
		font-size: 0.95em;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.report-button:hover {
		background-color: #f57c00;
		transform: scale(1.05);
	}

	.user-room {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding-top: 80px;

		transform: translateY(80px);
	}

	.stats.loading {
		opacity: 0.6;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.6;
		}
		50% {
			opacity: 1;
		}
	}

	.social-stats {
		display: flex;
		align-items: center;
		gap: 20px;
		background: var(--yellow);
		padding: 10px 20px;
		border-radius: 8px;
		border: 2px solid #f7c881;
	}

	.social-stats.loading {
		opacity: 0.6;
		animation: pulse 2s ease-in-out infinite;
	}

	.social-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.social-count {
		font-size: 1.1em;
		font-weight: 600;
		color: #333;
	}

	.social-label {
		font-size: 0.9em;
		color: #666;
		font-weight: 500;
	}

	.social-divider {
		width: 1px;
		height: 28px;
		background-color: rgba(200, 200, 200, 0.5);
	}

	.action-buttons {
		display: flex;
		gap: 12px;
		align-items: center;
	}

	.back-button-container {
		position: fixed;
		bottom: 0;
		left: 0;
		padding: 30px;
		z-index: 10;
		pointer-events: none;
	}

	.back-button {
		pointer-events: auto;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		text-align: center;
		gap: 4px;
		border: 2px solid white;
		padding: 12px 20px;
		width: auto;
		height: auto;
		box-sizing: border-box;
		border-radius: 8px;
		background-color: #ffffff25;
		color: white;
		text-decoration: none;
		transition: 0.2s;
		cursor: pointer;
		font-family: inherit;
		font-size: inherit;
	}

	.back-button:hover {
		background-color: white;
		color: black;
	}
</style>
