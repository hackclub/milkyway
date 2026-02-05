<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Room from '$lib/components/room/Room.svelte';
	import ProfileInfo from '$lib/components/ProfileInfo.svelte';
	import NavigationButtons from '$lib/components/NavigationButtons.svelte';
	import OnboardingOverlay from '$lib/components/OnboardingOverlay.svelte';
	import FaqPopup from '$lib/components/FaqPopup.svelte';
	import PromptPopup from '$lib/components/PromptPopup.svelte';
	import OvergladePopup from '$lib/components/OvergladePopup.svelte';
	import SpinWheel from '$lib/components/prompts/roulette/SpinWheel.svelte';
	import CreateProject from '$lib/components/CreateProject.svelte';
	import ShipProjectOverlay from '$lib/components/ShipProjectOverlay.svelte';
	import Announcements from '$lib/components/Announcements.svelte';
	import FurnitureSidebar from '$lib/components/room/FurnitureSidebar.svelte';
	import Bet from '$lib/components/Bet.svelte';
	import { env as PUBLIC_ENV } from '$env/dynamic/public';

	const SHOW_BLACKHOLE = PUBLIC_ENV.PUBLIC_SHOW_BLACKHOLE === 'true';

	let { data } = $props();

	// Project and UI state
	let projectList = $state(data.projects || []);
	let furnitureList = $state(data.furniture || []);
	let coins = $state(data.coins || 0);
	let stellarships = $state(data.stellarships || 0);
	let paintchips = $state(data.paintchips || 0);
	let showOnboarding = $state(!data.hasOnboarded);
	let user = $state(data.user); // Create separate state for user data
	
	// Debt state
	let debt = $state(Number(data.user?.debt) || 0);
	let debtNote = $state(data.user?.debtNote || '');
	let isPayingDebt = $state(false);
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
	let showBetIntro = $state(false);
	let currentBet = $state(data.currentBet || null);
	let showOvergladePopup = $state(!data.user?.overglade);
	
	// Blackhole results state
	let unclaimedBlackholeResults = $state(data.unclaimedBlackholeResults || []);
	let stellarShipProjectIds = $state(new Set(data.stellarShipProjectIds || []));
	let showBlackholePopup = $state(false);
	let selectedBlackholeResult = $state(/** @type {any} */ (null));
	let isClaimingBlackhole = $state(false);
	let isCreatureFading = $state(false);
	
	// Flying stellar ship animation
	/** @type {Array<{id: number, x: number, y: number}>} */
	let flyingStellarShips = $state([]);

	// Calculate total hours and project count
	// Total hours = code hours + approved art hours + pending art hours
	let totalHours = $derived(
		Number(
			projectList.reduce(
				(/** @type {number} */ sum, /** @type {any} */ project) =>
					sum +
					((project.hackatimeHours || 0) +
						(project.approvedArtHours || 0) +
						(project.pendingArtHours || 0)),
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
			projectList[index] = updatedProject;
			// Force reactivity update
			projectList = [...projectList];
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

	// Refresh current bet (called after placing a bet)
	async function refreshCurrentBet() {
		try {
			const response = await fetch('/api/bet/current');
			const data = await response.json();
			if (data.success) {
				if (data.bet) {
					currentBet = data.bet;
				} else {
					currentBet = null;
				}
			}
		} catch (error) {
			console.error('Error refreshing current bet:', error);
		}
	}

	// Calculate time remaining until end of bet
	function getTimeRemaining() {
		if (!currentBet || !currentBet.endDate) return { totalHours: 0 };
		const endDate = new Date(currentBet.endDate);
		const now = new Date();
		const diff = endDate.getTime() - now.getTime();
		
		if (diff <= 0) return { totalHours: 0 };
		
		const totalHours = diff / (1000 * 60 * 60);
		
		return { totalHours };
	}

	// Calculate progress percentage
	let betProgress = $derived.by(() => {
		if (!currentBet || !currentBet.hoursGoal) return 0;
		const hoursWorked = Number(currentBet.hoursWorked) || 0;
		const hoursGoal = Number(currentBet.hoursGoal) || 1;
		return Math.min((hoursWorked / hoursGoal) * 100, 100);
	});

	// Calculate total return if bet is won (bet amount + earnings)
	let potentialEarnings = $derived.by(() => {
		if (!currentBet) return 0;
		const betAmount = Number(currentBet.betAmount) || 0;
		const multiplier = Number(currentBet.multiplier) || 1;
		return Math.round(betAmount * multiplier);
	});

	// Calculate time remaining to claim (for won bets)
	function getClaimTimeRemaining() {
		if (!currentBet || currentBet.status !== 'won' || !currentBet.expiryDate) return { hours: 0, minutes: 0 };
		const expiry = new Date(currentBet.expiryDate);
		const now = new Date();
		const diff = expiry.getTime() - now.getTime();
		
		if (diff <= 0) return { hours: 0, minutes: 0 };
		
		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
		
		return { hours, minutes };
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

		// Listen for coins updates
		const handleCoinsUpdate = (event) => {
			if (event.detail && event.detail.amount !== undefined) {
				coins = coins + event.detail.amount;
			}
		};

		window.addEventListener('streak-updated', handleStreakUpdate);
		window.addEventListener('coins-updated', handleCoinsUpdate);

		return () => {
			window.removeEventListener('streak-updated', handleStreakUpdate);
			window.removeEventListener('coins-updated', handleCoinsUpdate);
		};
	});
	
	// Blackhole result handling
	function openBlackholeResult(result) {
		selectedBlackholeResult = result;
		showBlackholePopup = true;
	}
	
	function closeBlackholePopup() {
		showBlackholePopup = false;
		selectedBlackholeResult = null;
	}
	
	// Create flying stellar ship animation
	function createFlyingStellarShips() {
		const newShips = [];
		for (let i = 0; i < 5; i++) {
			newShips.push({
				id: Date.now() + i,
				x: Math.random() * 40 - 20,
				y: Math.random() * 20 - 10
			});
		}
		flyingStellarShips = [...flyingStellarShips, ...newShips];
		
		// Remove ships after animation completes
		setTimeout(() => {
			flyingStellarShips = flyingStellarShips.filter(s => !newShips.find(ns => ns.id === s.id));
		}, 1000);
	}
	
	async function claimStellarShip() {
		if (!selectedBlackholeResult || isClaimingBlackhole) return;
		
		isClaimingBlackhole = true;
		try {
			const response = await fetch('/api/blackhole/claim', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					submissionId: selectedBlackholeResult.id,
					action: 'claim'
				})
			});
			
			const result = await response.json();
			
			if (result.success) {
				// Create flying animation
				createFlyingStellarShips();
				
				// Start fading the creature
				isCreatureFading = true;
				
				// Close popup and remove from list after fade animation
				setTimeout(() => {
					unclaimedBlackholeResults = unclaimedBlackholeResults.filter(
						(/** @type {any} */ r) => r.id !== selectedBlackholeResult.id
					);
					isCreatureFading = false;
					closeBlackholePopup();
				// Refresh to pull updated stellarship count from Airtable formula
				window.location.reload();
				}, 600);
			} else {
				console.error('Failed to claim stellar ship:', result);
			}
		} catch (error) {
			console.error('Error claiming stellar ship:', error);
		} finally {
			isClaimingBlackhole = false;
		}
	}
	
	async function dismissBlackholeResult() {
		if (!selectedBlackholeResult || isClaimingBlackhole) return;
		
		isClaimingBlackhole = true;
		try {
			const response = await fetch('/api/blackhole/claim', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					submissionId: selectedBlackholeResult.id,
					action: 'dismiss'
				})
			});
			
			const result = await response.json();
			
			if (result.success) {
				// Start fading the creature
				isCreatureFading = true;
				
				// Remove from list after fade animation
				setTimeout(() => {
					unclaimedBlackholeResults = unclaimedBlackholeResults.filter(
						(/** @type {any} */ r) => r.id !== selectedBlackholeResult.id
					);
					isCreatureFading = false;
					closeBlackholePopup();
				}, 600);
			} else {
				console.error('Failed to dismiss:', result);
			}
		} catch (error) {
			console.error('Error dismissing result:', error);
		} finally {
			isClaimingBlackhole = false;
		}
	}
	
	// Get egg source with fallback
	function getEggSrc(egg) {
		if (!egg) return '/projects/sparkle_egg1.png';
		return egg.startsWith('/') ? egg : `/${egg}`;
	}

	// Pay debt function
	async function payDebt() {
		if (isPayingDebt || debt <= 0 || coins <= 0) return;
		
		isPayingDebt = true;
		try {
			const response = await fetch('/api/pay-debt', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			
			const result = await response.json();
			
			if (result.success) {
				// Update local state
				coins = result.newCoins;
				debt = result.newDebt;
				if (result.fullyPaid) {
					debtNote = '';
				}
			} else {
				console.error('Failed to pay debt:', result.error);
			}
		} catch (error) {
			console.error('Error paying debt:', error);
		} finally {
			isPayingDebt = false;
		}
	}
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

	<!-- Debt Box -->
	{#if debt > 0}
		<div class="debt-box">
			<div class="debt-content">
				<p class="debt-title">you are in debt for {debt} coins for:</p>
				<p class="debt-note">{debtNote || 'unknown reason'}</p>
				<button 
					class="pay-debt-button" 
					onclick={payDebt}
					disabled={isPayingDebt || coins <= 0}
				>
					{#if isPayingDebt}
						paying...
					{:else if coins <= 0}
						no coins
					{:else}
						pay debt
					{/if}
				</button>
			</div>
		</div>
	{/if}

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
		
		<!-- Creature peeking from blackhole with result -->
		{#if unclaimedBlackholeResults.length > 0 && !isCreatureFading}
			{@const result = unclaimedBlackholeResults[0]}
			<button 
				class="blackhole-creature-peek" 
				onclick={() => openBlackholeResult(result)}
				aria-label="View blackhole result"
			>
				<img src={getEggSrc(result.projectEgg)} alt={result.projectName} class="peek-creature-img" />
				<span class="peek-exclamation">!</span>
			</button>
		{/if}
		
		<!-- Fading creature when claimed/dismissed -->
		{#if isCreatureFading && selectedBlackholeResult}
			<div class="blackhole-creature-peek fading">
				<img src={getEggSrc(selectedBlackholeResult.projectEgg)} alt={selectedBlackholeResult.projectName || 'project'} class="peek-creature-img" />
			</div>
		{/if}
		
		<!-- Blackhole result popup (no overlay, just side panel) -->
		{#if showBlackholePopup && selectedBlackholeResult}
			<div class="blackhole-popup">
				<div class="blackhole-popup-content">
					{#if selectedBlackholeResult.status === 'approved'}
						<p class="blackhole-popup-title">
							{selectedBlackholeResult.projectName} returned successfully from the black hole!
						</p>
					{:else}
						<p class="blackhole-popup-title">
							{selectedBlackholeResult.projectName} was rejected from the black hole :(
						</p>
					{/if}
					
					{#if selectedBlackholeResult.reason}
						<p class="blackhole-popup-reason">{selectedBlackholeResult.reason}</p>
					{/if}
					
					<div class="blackhole-popup-actions">
						{#if selectedBlackholeResult.status === 'approved'}
							<button 
								class="blackhole-claim-btn" 
								onclick={claimStellarShip}
								disabled={isClaimingBlackhole}
							>
								<img src="/stellarship.png" alt="" aria-hidden="true" class="blackhole-claim-icon" />
								{isClaimingBlackhole ? 'claiming...' : 'claim stellar ship'}
							</button>
						{:else}
							<button 
								class="blackhole-dismiss-btn" 
								onclick={dismissBlackholeResult}
								disabled={isClaimingBlackhole}
							>
								{isClaimingBlackhole ? '...' : 'oh okay.'}
							</button>
						{/if}
					</div>
				</div>
			</div>
		{/if}
		
		<!-- Flying stellar ships animation -->
		{#each flyingStellarShips as ship (ship.id)}
			<img 
				src="/stellarship.png" 
				alt="" 
				class="flying-stellar-ship"
				style="--offset-x: {ship.x}px; --offset-y: {ship.y}px;"
			/>
		{/each}
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
			onPaintChipsClaimed={(chips) => { paintchips += chips; }}
			variant={user?.wallVariant}
			{stellarShipProjectIds}
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

	<!-- Betting Image -->
	<div class="bet-section">
		<div class="bet-button-wrapper">
			{#if currentBet && currentBet.status === 'active'}
				{@const timeRemaining = getTimeRemaining()}
				<div class="bet-tooltip">
					<div class="bet-progress-section">
						<div class="bet-progress-label">
							{(Number(currentBet.hoursWorked) || 0).toFixed(1)} / {Number(currentBet.hoursGoal) || 0} hours
						</div>
						<div class="bet-progress-bar">
							<div class="bet-progress-fill" style="width: {betProgress}%"></div>
						</div>
					</div>
					<div class="bet-time-remaining">
						{timeRemaining.totalHours.toFixed(2)} hours left
					</div>
					<div class="bet-earnings-reminder">
						earn {potentialEarnings} coins if you win!
					</div>
				</div>
			{:else if currentBet && currentBet.status === 'won'}
				{@const claimTime = getClaimTimeRemaining()}
				<div class="bet-tooltip">
					<div class="bet-claim-message">
						you won the bet! click to claim {Number(currentBet.coinsEarned) || 0} coins within {claimTime.hours > 0 ? `${claimTime.hours}h ` : ''}{claimTime.minutes}m
					</div>
				</div>
			{:else if currentBet && (currentBet.status === 'lost' || currentBet.status === 'expired')}
				<div class="bet-tooltip">
					<div class="bet-lost-message">
						{#if currentBet.status === 'lost'}
							bet ended, you had {(Number(currentBet.hoursWorked) || 0).toFixed(1)} out of {Number(currentBet.hoursGoal) || 0} hours. place a new bet to try again!
						{:else}
							bet expired — you didn't claim in time. place a new bet to try again!
						{/if}
					</div>
				</div>
			{/if}
			<button 
				class="bet-button"
				class:disabled={currentBet && currentBet.status === 'active'}
				disabled={currentBet && currentBet.status === 'active'}
				onclick={(/** @type {MouseEvent} */ e) => {
					if (currentBet && currentBet.status === 'active') {
						e.preventDefault();
						e.stopPropagation();
						return false;
					}
					if (currentBet && currentBet.status === 'won') {
						// Skip dialogue and go directly to /bet for claiming
						e.preventDefault();
						goto('/bet');
						return false;
					}
					// For lost/expired/claimed bets, or no bet, show intro
					showBetIntro = true;
				}}
				aria-label={currentBet && currentBet.status === 'active' ? 'Active bet in progress' : currentBet && currentBet.status === 'won' ? 'Claim your bet reward' : 'Open betting'}
			>
				<img 
					src="/bet/mimo.png" 
					alt="Bet" 
					class="bet-image"
				/>
			</button>
		</div>
	</div>

	<Bet showPopup={showBetIntro} onClose={() => showBetIntro = false} />

	<OvergladePopup 
		showPopup={showOvergladePopup} 
		onClose={() => showOvergladePopup = false}
		{user}
	/>
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

	/* Creature peeking from blackhole */
	.blackhole-creature-peek {
		position: fixed;
		top: 340px;
		right: 70px;
		z-index: 125;
		cursor: pointer;
		background: none;
		border: none;
		padding: 0;
		display: flex;
		align-items: center;
	}

	.blackhole-creature-peek.fading {
		animation: creatureFadeOut 0.6s ease-out forwards;
		pointer-events: none;
	}

	@keyframes creatureFadeOut {
		0% {
			opacity: 1;
			transform: scale(1);
		}
		100% {
			opacity: 0;
			transform: scale(0.8);
		}
	}

	.peek-creature-img {
		width: 60px;
		height: auto;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
		transition: transform 0.2s;
	}

	.blackhole-creature-peek:hover .peek-creature-img {
		transform: scale(1.1);
	}

	.peek-exclamation {
		position: absolute;
		top: -8px;
		right: -4px;
		background: var(--orange, #ff6b35);
		color: white;
		font-weight: bold;
		font-size: 14px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		animation: exclamationPulse 1s ease-in-out infinite;
	}

	@keyframes exclamationPulse {
		0%, 100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.1);
		}
	}

	/* Blackhole popup - styled like project info box */
	.blackhole-popup {
		position: fixed;
		top: 200px;
		right: 200px;
		z-index: 130;
	}

	.blackhole-popup-content {
		border: 4px solid var(--orange, #ff6b35);
		border-radius: 8px;
		background: var(--yellow, #ffd166);
		padding: 12px;
		max-width: 280px;
		color: #333;
	}

	.blackhole-popup-title {
		font-size: 0.95rem;
		line-height: 1.4;
		margin: 0 0 8px 0;
		font-weight: 500;
	}

	.blackhole-popup-reason {
		font-size: 0.8rem;
		color: #555;
		margin: 0 0 12px 0;
		padding: 8px;
		background: rgba(0, 0, 0, 0.05);
		border-radius: 4px;
		line-height: 1.4;
	}

	.blackhole-popup-actions {
		display: flex;
		gap: 8px;
	}

	/* Buttons styled like project info actions (e.g., create artlog) */
	.blackhole-claim-btn,
	.blackhole-dismiss-btn {
		min-width: 0;
		padding: 6px 10px;
		border-radius: 6px;
		border: none; /* match create artlog / ship project buttons */
		background: var(--orange);
		color: white;
		font-size: 0.85rem;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.1s ease;
		box-shadow: none;
		transform: none;
	}

	.blackhole-dismiss-btn:hover:not(:disabled), .blackhole-claim-btn:hover:not(:disabled) {
		background: #e67e00;
	}

	.blackhole-claim-icon {
		height: 1em;
		width: auto;
		margin-right: 2px;
		margin-bottom: -2px;
	}

	.blackhole-claim-btn:disabled,
	.blackhole-dismiss-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	/* Dismiss button uses gray variant, same shape/no border */
	/* .blackhole-dismiss-btn {
		background: #e6e6e6;
		color: #444;
	}

	.blackhole-dismiss-btn:hover:not(:disabled) {
		background: #d9d9d9;
	} */

	/* Flying stellar ship animation */
	.flying-stellar-ship {
		position: fixed;
		top: 340px;
		right: 100px;
		width: 30px;
		height: auto;
		pointer-events: none;
		z-index: 99999;
		animation: flyToTopLeft 1s ease-out forwards;
	}

	@keyframes flyToTopLeft {
		0% {
			opacity: 1;
			transform: translate(var(--offset-x, 0), var(--offset-y, 0)) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(calc(-70vw + var(--offset-x, 0)), calc(-30vh + var(--offset-y, 0))) scale(0.5);
		}
	}

	/* Betting Section */
	.bet-section {
		position: fixed;
		bottom: 0;
		left: 450px;
		z-index: 50;
		display: flex;
		justify-content: center;
		align-items: center;
		bottom: -30px;
	}

	.bet-section:hover {
		bottom: -20px;
	}

	.bet-button-wrapper {
		position: relative;
		display: inline-block;
	}

	.bet-button {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		pointer-events: auto;
	}

	.bet-button.disabled {
		cursor: not-allowed;
		opacity: 0.8;
	}

	.bet-button.disabled:hover {
		transform: none;
	}

	.bet-button.disabled:active {
		pointer-events: none;
	}

	.bet-image {
		max-width: 150px;
		width: auto;
		height: auto;
		display: block;
		pointer-events: none;
	}

	.bet-button:focus {
		outline: 2px solid #F7C881;
	}

	.bet-tooltip {
		position: absolute;
		bottom: calc(100% + 12px);
		left: 50%;
		transform: translateX(-50%);
		background: #1a1a1a;
		border: 2px solid #333;
		border-radius: 8px;
		padding: 16px;
		min-width: 250px;
		z-index: 10000;
		pointer-events: none;
		opacity: 0;
		visibility: hidden;
		transition: opacity 0.2s, visibility 0.2s;
	}

	.bet-button-wrapper:hover .bet-tooltip {
		opacity: 1;
		visibility: visible;
	}

	.bet-tooltip::after {
		content: "";
		position: absolute;
		top: 100%;
		left: 50%;
		margin-left: -5px;
		border-width: 5px;
		border-style: solid;
		border-color: #333 transparent transparent transparent;
	}

	.bet-progress-section {
		margin-bottom: 12px;
	}

	.bet-progress-label {
		font-size: 14px;
		color: #FDF0D0;
		margin-bottom: 6px;
		text-align: center;
	}

	.bet-progress-bar {
		width: 100%;
		height: 8px;
		background: #333;
		border-radius: 4px;
		overflow: hidden;
	}

	.bet-progress-fill {
		height: 100%;
		background: #FDF0D0;
	}

	.bet-time-remaining {
		font-size: 12px;
		color: #999;
		text-align: center;
		margin-bottom: 8px;
	}

	.bet-earnings-reminder {
		font-size: 12px;
		color: #FDF0D0;
		text-align: center;
		font-weight: bold;
	}

	.bet-claim-message {
		font-size: 14px;
		color: #FDF0D0;
		text-align: center;
		font-weight: bold;
		padding: 8px 0;
	}

	.bet-lost-message {
		font-size: 14px;
		color: #999;
		text-align: center;
		padding: 8px 0;
		line-height: 1.4;
	}

	/* Debt Box Styles */
	.debt-box {
		position: fixed;
		top: 50px;
		left: 370px;
		z-index: 2;
	}

	.debt-content {
		background-color: #fbf2bf;
		border: 4px solid #f7c881;
		padding: 12px 16px;
		border-radius: 8px;
		max-width: 200px;
	}

	.debt-title {
		margin: 0 0 4px 0;
		font-size: 0.9em;
		color: #333;
	}

	.debt-note {
		margin: 0 0 12px 0;
		font-size: 0.85em;
		color: #666;
		font-style: italic;
	}

	.pay-debt-button {
		font-family: inherit;
		font-size: 14px;
		width: 100%;
		background-color: #f7c881;
		border: none;
		border-radius: 8px;
		padding: 8px 16px;
		color: #333;
		cursor: pointer;
		transition: background-color 0.2s, color 0.2s;
	}

	.pay-debt-button:hover:not(:disabled) {
		background-color: white;
		color: black;
	}

	.pay-debt-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
