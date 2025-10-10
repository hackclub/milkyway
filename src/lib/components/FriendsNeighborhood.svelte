<script>
import Room from './room/Room.svelte';

let {
  friendsRooms = [],
  loadingFriends = false,
  userRoom,
  userName,
  selectedProjectId = $bindable(null),
  onSelectProject
} = $props();

// Pan state
let isPanning = $state(false);
let panOffset = $state({ x: 0, y: 0 });
let panStart = $state({ x: 0, y: 0 });

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
    <Room {...userRoom} {selectedProjectId} {onSelectProject} hideControls={true} readOnly={false} />
    <div class="room-label">{userName} (you)</div>
  </div>

  <!-- Friends' rooms in hexagonal pattern -->
  {#each friendsRooms as friend, index (friend.id)}
    <div class="room-wrapper friend-room friend-room-{index}" class:loading={loadingFriends}>
      {#if !loadingFriends}
        <Room 
          projectList={friend.projects}
          furnitureList={friend.furniture || []}
          user={friend}
          onShowPromptPopup={() => {}}
          onOpenRouletteSpin={() => {}}
          onDeleteProject={() => {}}
          readOnly={true}
          hideControls={true}
          {selectedProjectId}
          {onSelectProject}
        />
      {:else}
        <!-- Loading placeholder -->
        <div class="room-placeholder">
          <div class="placeholder-room-bg"></div>
        </div>
      {/if}
      <div class="room-label" class:loading={loadingFriends}>{friend.username}</div>
    </div>
  {/each}
</div>

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
.friend-room-0 { transform: translate(-600px, 0); }
.friend-room-1 { transform: translate(-300px, -540px); }
.friend-room-2 { transform: translate(300px, -540px); }
.friend-room-3 { transform: translate(600px, 0); }
.friend-room-4 { transform: translate(300px, 540px); }
.friend-room-5 { transform: translate(-300px, 540px); }

/* Room labels */
.room-label {
  position: absolute;
  top: 250px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(251, 242, 191, 0.95);
  border: 3px solid #F7C881;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 1.8em;
  font-weight: bold;
  color: #333;
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;
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
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
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
  background: rgba(255,255,255,0.15);
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  animation: pulse 2s ease-in-out infinite 0.5s;
}

.room-label.loading {
  opacity: 0.6;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}
</style>

