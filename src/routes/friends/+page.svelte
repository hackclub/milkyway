<script>
	import { onMount } from 'svelte';
	import FriendsNeighborhood from '$lib/components/FriendsNeighborhood.svelte';

	let { data } = $props();

	let selectedProjectId = $state(/** @type {string | null} */ (null));
	let friendsRooms = $state(/** @type {any[]} */ ([]));
	let allFriends = $state(/** @type {any[]} */ ([]));
	let loadingFriends = $state(true);
	let searchQuery = $state('');
	let globalSearchLoading = $state(false);
	let noResults = $state(false);
	let debounceHandle;

	// Filter friends based on search query
	$effect(() => {
		if (searchQuery.trim() === '') {
			friendsRooms = allFriends;
		} else {
			const query = searchQuery.toLowerCase();
			friendsRooms = allFriends.filter(
				(friend) => friend.username && friend.username.toLowerCase().includes(query)
			);
		}
	});

	function triggerGlobalSearch() {
		const q = searchQuery.trim();
		if (q.length < 2) {
			noResults = false;
			return;
		}
		globalSearchLoading = true;
		fetch(`/api/search-users?q=${encodeURIComponent(q)}&limit=12&includeProjects=true`)
			.then((r) => r.json())
			.then((res) => {
				if (res.success) {
					friendsRooms = res.users; // overwrite with global search results
					noResults = res.users.length === 0;
				} else {
					noResults = true;
				}
			})
			.catch(() => {
				noResults = true;
			})
			.finally(() => {
				globalSearchLoading = false;
			});
	}

	$effect(() => {
		clearTimeout(debounceHandle);
		const q = searchQuery.trim();
		if (q === '') {
			noResults = false;
			friendsRooms = allFriends;
			return;
		}
		debounceHandle = setTimeout(() => {
			triggerGlobalSearch();
		}, 300);
	});

	// Load friends data on mount
	onMount(async () => {
		// Create placeholder friends immediately
		friendsRooms = Array(6)
			.fill(null)
			.map((_, i) => ({
				id: `placeholder-${i}`,
				username: 'Loading...',
				projects: []
			}));
		allFriends = friendsRooms;

		// Fetch actual friends data progressively
		try {
			const response = await fetch('/api/get-friends?count=6');

			if (response.ok) {
				const result = await response.json();

				if (result.friends && result.friends.length > 0) {
					// Store all friends and show them
					allFriends = result.friends;
					friendsRooms = result.friends;
				}
			} else {
				console.error('Failed to fetch friends:', response.status);
			}
		} catch (error) {
			console.error('Error fetching friends:', error);
		} finally {
			loadingFriends = false;
		}
	});
</script>

<svelte:head>
	<title>Friends ✦ Milkyway</title>
</svelte:head>

<main class="friends-view">
	<FriendsNeighborhood
		{friendsRooms}
		{loadingFriends}
		userRoom={{
			projectList: data.projects,
			furnitureList: data.furniture || [],
			user: data.user,
			onShowPromptPopup: () => {},
			onOpenRouletteSpin: () => {},
			onDeleteProject: () => {}
		}}
		userName={data.user?.username || 'You'}
		currentUserId={data.user?.recId || null}
		bind:selectedProjectId
		onSelectProject={(/** @type {string | null} */ id) => {
			selectedProjectId = id;
		}}
	/>
	<p class="friends-view-title">Here are some random Milkyway members...</p>

	<!-- Search bar -->
	<div class="search-container">
		<input
			type="text"
			class="search-input"
			placeholder="Search for friends..."
			bind:value={searchQuery}
		/>
		{#if searchQuery.trim() !== ''}
			<button
				class="clear-search"
				onclick={() => {
					searchQuery = '';
				}}
				aria-label="Clear search"
			>
				✕
			</button>
		{/if}
	</div>

	<!-- Search bar -->
	{#if globalSearchLoading}
		<p class="search-status">searching the milkyway...</p>
	{:else if noResults}
		<p class="search-status">No users found.</p>
	{/if}

	<!-- Back button -->
	<div class="back-button-container">
		<a href="/home" class="back-button">
			<span>← back to home</span>
		</a>
	</div>
</main>

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

	.friends-view-title {
		text-align: center;
		color: white;
		z-index: 10;
		position: fixed;
		width: 100%;
		top: 20px;
		margin: 0;
		font-size: 1.2rem;
	}

	.search-container {
		position: fixed;
		top: 20px; /* allineata con il titolo */
		right: 30px; /* spostata a destra per non coprire le stanze */
		left: auto;
		transform: none;
		z-index: 15; /* sopra le stanze */
		width: 280px; /* dimensione compatta */
		max-width: 40vw;
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}

	@media (max-width: 600px) {
		.search-container {
			width: 200px; /* più piccola su mobile */
			right: 16px;
			top: 16px;
		}
	}

	.search-input {
		flex: 1;
		padding: 10px 14px;
		border: 2px solid white;
		border-radius: 8px;
		background-color: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(10px);
		color: white;
		font-family: inherit;
		font-size: 0.95rem;
		outline: none;
		transition: all 0.2s;
	}

	.search-input::placeholder {
		color: rgba(255, 255, 255, 0.6);
	}

	.search-input:focus {
		background-color: rgba(255, 255, 255, 0.25);
		border-color: white;
		box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
	}

	.clear-search {
		position: absolute;
		right: 12px;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: white;
		font-size: 1.2rem;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 4px;
		transition: all 0.2s;
		opacity: 0.6;
	}

	.clear-search:hover {
		opacity: 1;
		background-color: rgba(255, 255, 255, 0.2);
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

	.search-status {
		position: fixed;
		top: 100px;
		right: 30px;
		color: white;
		font-size: 0.85rem;
		background: rgba(0, 0, 0, 0.35);
		padding: 6px 10px;
		border-radius: 6px;
		backdrop-filter: blur(6px);
		z-index: 15;
	}
</style>
