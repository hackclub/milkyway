<script>
	import { onMount } from 'svelte';
	import Room from '$lib/components/room/Room.svelte';
	import ProfileInfo from '$lib/components/ProfileInfo.svelte';
	import NavigationButtons from '$lib/components/NavigationButtons.svelte';
	import OnboardingOverlay from '$lib/components/OnboardingOverlay.svelte';
	import FaqPopup from '$lib/components/FaqPopup.svelte';
	import PromptPopup from '$lib/components/PromptPopup.svelte';
	import SpinWheel from '$lib/components/prompts/roulette/SpinWheel.svelte';
	import CreateProject from '$lib/components/CreateProject.svelte';
	import ShipProjectOverlay from '$lib/components/ShipProjectOverlay.svelte';
	import Announcements from '$lib/components/Announcements.svelte';
	import FurnitureSidebar from '$lib/components/room/FurnitureSidebar.svelte';
	import { PUBLIC_SHOW_BLACKHOLE } from '$env/static/public';

	const SHOW_BLACKHOLE = PUBLIC_SHOW_BLACKHOLE === 'true';

	let { data } = $props();

	// Project and UI state
	let projectList = $state(data.projects || []);
	let furnitureList = $state(data.furniture || []);
	let coins = $state(data.coins || 0);
	let stellarships = $state(data.stellarships || 0);
	let paintchips = $state(data.paintchips || 0);
	let showOnboarding = $state(!data.hasOnboarded);
	let user = $state(data.user); // Create separate state for user data
	let showFaqPopup = $state(false);
	let showPromptPopup = $state(false);
	let currentPromptInfo = $state('');
	let currentRouletteResults = $state(null);
	let showRouletteSpinWheel = $state(false);
	let rouletteSpinProjectId = $state(/** @type {string | null} */ (null));
	let rouletteSpinProgress = $state(/** @type {any} */ (null));
	let isCreateOpen = $state(false);
	let showShipOverlay = $state(false);
	let shipProjectInfo = $state(/** @type {any} */ (null));
	let showFurnitureSidebar = $state(false);

	// Calculate total hours and project count
	let totalHours = $derived(
		Number(
			projectList.reduce(
				(/** @type {number} */ sum, /** @type {any} */ project) =>
					sum + (project.totalHours || project.hours || 0),
				0
			)
		)
	);
	let projectCount = $derived(projectList.length);

	// Function to handle prompt popup
	/**
	 * @param {string} promptInfo
	 * @param {any} rouletteResults
	 */
	function showPromptPopupHandler(promptInfo, rouletteResults = null) {
		currentPromptInfo = promptInfo;
		currentRouletteResults = rouletteResults;
		showPromptPopup = true;
	}

	// Function to handle roulette spinning from ProjectEgg
	/**
	 * @param {string} projectId
	 * @param {any} existingProgress
	 */
	function openRouletteSpinHandler(projectId, existingProgress) {
		rouletteSpinProjectId = projectId;
		rouletteSpinProgress = existingProgress;
		showRouletteSpinWheel = true;
	}

	// Function to handle roulette completion
	/**
	 * @param {any} updatedProject
	 */
	async function handleRouletteCompleted(updatedProject) {
		// Update the project in the list
		const index = projectList.findIndex(/** @param {any} p */ (p) => p.id === updatedProject.id);
		if (index !== -1) {
			projectList[index] = updatedProject;
		}
		showRouletteSpinWheel = false;
	}

	// Function to handle roulette close
	async function handleRouletteClose() {
		// Refresh the project data
		if (rouletteSpinProjectId) {
			try {
				const response = await fetch(`/api/projects?id=${rouletteSpinProjectId}`);
				if (response.ok) {
					const data = await response.json();
					if (data.success && data.project) {
						const index = projectList.findIndex(
							/** @param {any} p */ (p) => p.id === data.project.id
						);
						if (index !== -1) {
							projectList[index] = data.project;
						}
					}
				}
			} catch (error) {
				console.error('Error refreshing project:', error);
			}
		}
		showRouletteSpinWheel = false;
	}

	// Function to handle ship project
	function handleShipProject(projectInfo) {
		shipProjectInfo = projectInfo;
		showShipOverlay = true;
	}

	// Function to handle ship project completion
	async function handleShipProjectCompleted(projectData) {
		console.log('Updating project with data:', projectData);
		// Update the project in the list
		const index = projectList.findIndex(/** @param {any} p */ (p) => p.id === projectData.id);
		if (index !== -1) {
			const updatedProject = {
				...projectList[index],
				shipped: true,
				shippedDate: new Date().toISOString(),
				egg: projectData.egg || projectList[index].egg,
				status: projectData.status || projectList[index].status
			};
			console.log('Updating project at index', index, 'with egg:', updatedProject.egg);
			projectList[index] = updatedProject;
			// Force reactivity update
			projectList = [...projectList];
		} else {
			console.log('Project not found in list:', projectData.id);
		}
		showShipOverlay = false;
		shipProjectInfo = null;
	}

	// Function to close ship overlay
	function closeShipOverlay() {
		showShipOverlay = false;
		shipProjectInfo = null;
	}

	// Function to handle logout
	async function handleLogout() {
		try {
			// Call the server endpoint to delete the httpOnly cookie
			await fetch('/api/logout', { method: 'POST' });
			// Redirect to home page
			window.location.href = '/';
		} catch (error) {
			console.error('Logout failed:', error);
			// Still redirect even if logout fails
			window.location.href = '/';
		}
	}

	// Function to refresh user data after announcement rewards
	async function handleAnnouncementRewards() {
		try {
			const response = await fetch('/api/get-user-data');
			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					coins = result.coins;
					stellarships = result.stellarships;
					paintchips = result.paintchips;
					furnitureList = result.furniture;
				}
			}
		} catch (error) {
			console.error('Error refreshing user data:', error);
		}
	}

	// Function to refresh user data when profile is updated
	async function handleUserUpdate() {
		try {
			const response = await fetch('/api/get-user-profile');
			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					// Update the user state
					user = result.user;
				}
			}
		} catch (error) {
			console.error('Error refreshing user data:', error);
		}
	}

	// Auto-update Hackatime hours in the background after page load
	async function autoUpdateHackatimeHours() {
		try {
			const response = await fetch('/api/auto-update-hackatime', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				const result = await response.json();

				if (result.success && !result.skipped && result.updatedCount > 0) {
					// Refresh project list to get updated hours
					const projectsResponse = await fetch('/api/get-user-data');
					if (projectsResponse.ok) {
						const userData = await projectsResponse.json();
						if (userData.success && userData.projects) {
							projectList = userData.projects;
						}
					}
				} else if (result.skipped) {
				}
			}
		} catch (error) {
			// Silently fail - this is a background operation
		}
	}

	// Run auto-update after page loads
	onMount(() => {
		// Wait a bit to let the page load first, then update in background
		setTimeout(() => {
			autoUpdateHackatimeHours();
		}, 2000); // 2 second delay to not interfere with initial page load

		// Listen for streak updates
		const handleStreakUpdate = (event) => {
			if (event.detail && event.detail.streak !== undefined && user) {
				user = { ...user, devlogStreak: event.detail.streak };
			}
		};

		window.addEventListener('streak-updated', handleStreakUpdate);

		return () => {
			window.removeEventListener('streak-updated', handleStreakUpdate);
		};
	});
</script>

<svelte:head>
	<title>Home ✦ Milkyway</title>
</svelte:head>

<main>
	{#if showOnboarding}
		<OnboardingOverlay
			onClose={() => {
				showOnboarding = false;
			}}
			{user}
		></OnboardingOverlay>
	{/if}
	{#if showOnboarding}
		<OnboardingOverlay
			onClose={() => {
				showOnboarding = false;
			}}
			{user}
		></OnboardingOverlay>
	{/if}

	<FaqPopup
		showPopup={showFaqPopup}
		onClose={() => {
			showFaqPopup = false;
		}}
	/>

	<PromptPopup
		bind:showPopup={showPromptPopup}
		promptInfo={currentPromptInfo}
		rouletteResults={currentRouletteResults}
	/>

	<Announcements onRewardsClaimed={handleAnnouncementRewards} />

	<!-- Profile Info -->
	<ProfileInfo
		{user}
		{totalHours}
		{projectCount}
		{coins}
		{stellarships}
		{paintchips}
		devlogStreak={user?.devlogStreak || 0}
		onLogout={handleLogout}
		onUserUpdate={handleUserUpdate}
	/>

	<!-- Navigation Buttons -->
	<NavigationButtons
		onOpenFaq={() => {
			showFaqPopup = true;
		}}
	/>

	<!-- Referral Button -->
	<a href="/referrals" class="referral-button">
		<img src="/referrals.png" alt="Referrals" />
	</a>

	<!-- Blackhole -->
	{#if SHOW_BLACKHOLE}
		<a href="/blackhole" class="blackhole-link" aria-label="Enter the Black Hole">
			<img src="/blackhole.png" alt="Black Hole" />
		</a>
	{/if}

	<!-- Furniture Sidebar - Rendered at page level so it appears on top -->
	{#if showFurnitureSidebar}
		<FurnitureSidebar
			bind:furnitureList
			{user}
			onClose={() => {
				showFurnitureSidebar = false;
			}}
		/>
	{/if}

	<!-- Your Room -->
	<div class="user-room">
		<Room
			bind:projectList
			bind:furnitureList
			bind:isCreateOpen
			bind:showFurnitureSidebar
			{user}
			currentUser={user}
			onShowPromptPopup={showPromptPopupHandler}
			onOpenRouletteSpin={openRouletteSpinHandler}
			onDeleteProject={() => {}}
			onShipProject={handleShipProject}
			variant={user?.wallVariant}
		/>
	</div>

	{#if showRouletteSpinWheel}
		<div class="page-level-spin-overlay">
			<SpinWheel
				projectId={rouletteSpinProjectId}
				existingProgress={rouletteSpinProgress}
				onClose={handleRouletteClose}
				onProjectCreated={handleRouletteCompleted}
			/>
		</div>
	{/if}

	{#if isCreateOpen}
		<CreateProject
			onClose={() => {
				isCreateOpen = false;
			}}
			bind:projectList
		/>
	{/if}

	{#if showShipOverlay}
		<ShipProjectOverlay
			showPopup={showShipOverlay}
			onClose={closeShipOverlay}
			projectInfo={shipProjectInfo}
			onShip={handleShipProjectCompleted}
			{user}
		/>
	{/if}
</main>

<style>
	main {
		background-image: url('/milkyway bg.png');
		background-size: cover;
		background-position: center;
		height: 100%;
		width: 100%;
		box-sizing: border-box;
		position: absolute;
		overflow: hidden;
	}

	.user-room {
		view-transition-name: user-room;
		width: 100%;
		height: 100%;
	}

	.page-level-spin-overlay {
		position: fixed !important;
		top: 0 !important;
		left: 0 !important;
		width: 100vw !important;
		height: 100vh !important;
		z-index: 200 !important;
		background-color: #000 !important;
	}

	.referral-button {
		position: fixed;
		top: 32px;
		right: 32px;
		z-index: 100;
		cursor: pointer;
	}
	.referral-button img {
		display: block;
		height: 150px;
		width: auto;
	}

	.blackhole-link {
		position: fixed;
		top: 200px;
		right: 24px;
		z-index: 120;
		cursor: pointer;
		display: block;
		transform: none;
	}

	.blackhole-link img {
		display: block;
		height: 160px;
		width: auto;
		pointer-events: auto;
		animation:
			spin 20s linear infinite,
			glow-pulse 50s ease-in-out infinite;
	}

	@keyframes glow-pulse {
		0%,
		100% {
			filter: drop-shadow(0 0 12px rgba(100, 149, 237, 0.5))
				drop-shadow(0 0 25px rgba(70, 130, 220, 0.3));
		}
		25% {
			filter: drop-shadow(0 0 18px rgba(120, 100, 220, 0.6))
				drop-shadow(0 0 35px rgba(140, 80, 200, 0.4));
		}
		50% {
			filter: drop-shadow(0 0 14px rgba(160, 80, 200, 0.55))
				drop-shadow(0 0 30px rgba(130, 70, 180, 0.35));
		}
		75% {
			filter: drop-shadow(0 0 16px rgba(130, 120, 230, 0.55))
				drop-shadow(0 0 32px rgba(100, 100, 210, 0.35));
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
</style>
