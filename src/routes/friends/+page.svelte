<script>
import { onMount } from 'svelte';
import FriendsNeighborhood from '$lib/components/FriendsNeighborhood.svelte';

let { data } = $props();

let selectedProjectId = $state(/** @type {string | null} */ (null));
let friendsRooms = $state(/** @type {any[]} */ ([]));
let loadingFriends = $state(true);

// Load friends data on mount
onMount(async () => {
  // Create placeholder friends immediately
  friendsRooms = Array(6).fill(null).map((_, i) => ({
    id: `placeholder-${i}`,
    username: 'Loading...',
    projects: []
  }));

  // Fetch actual friends data progressively
  try {
    const response = await fetch('/api/get-friends?count=6');
    
    if (response.ok) {
      const result = await response.json();
      
      // Clear placeholders and show friends one by one as they load
      friendsRooms = [];
      
      if (result.friends && result.friends.length > 0) {
        // Show all friends at once
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
    bind:selectedProjectId
    onSelectProject={(/** @type {string | null} */ id) => { selectedProjectId = id; }}
  />
  <p class="friends-view-title">Here are some random Milkyway members...</p>

  <!-- Back button -->
  <div class="back-button-container">
    <a href="/home" class="back-button">
      <span>← back to home</span>
    </a>
  </div>
</main>

<style>
main {
  background-image: url("/milkyway bg.png");
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

