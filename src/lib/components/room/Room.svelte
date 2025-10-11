<script>
import FloorTile from '$lib/components/FloorTile.svelte';
import ProjectEgg from '$lib/components/room/ProjectEgg.svelte';
import FurnitureItem from '$lib/components/room/FurnitureItem.svelte';
import ExpandableButton from '$lib/components/ExpandableButton.svelte';

let {
  projectList = $bindable([]),
  furnitureList = $bindable([]),
  isCreateOpen = $bindable(false),
  user,
  onShowPromptPopup,
  onOpenRouletteSpin,
  onDeleteProject,
  readOnly = false,
  selectedProjectId = null,
  onSelectProject = null,
  hideControls = false
} = $props();

let isEditingRoom = $state(false);
let selectedEggForMove = $state(null);
let selectedFurnitureForMove = $state(null);

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

// Floor bounds - true rhombus shape (diamond)
// Based on: top (0,0), left (-300,150), right (300,150), bottom (0,300)
const FLOOR_BOUNDS = {
  topY: 0,        // Top point of the rhombus
  middleY: 150,   // Widest point (middle)
  bottomY: 300,   // Bottom point of the rhombus
  maxWidth: 560   // Width at the middle (300 on each side)
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
    const progress = (clampedY - FLOOR_BOUNDS.middleY) / (FLOOR_BOUNDS.bottomY - FLOOR_BOUNDS.middleY);
    width = FLOOR_BOUNDS.maxWidth * (1 - progress);
  }
  
  return {
    minX: -width / 2,
    maxX: width / 2
  };
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
  projectList = projectList.filter(project => project.id !== projectId);
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

// Function to handle furniture deletion
/**
 * @param {any} furnitureId
 */
function deleteFurnitureHandler(furnitureId) {
  // Remove the furniture from the list
  furnitureList = furnitureList.filter(furniture => furniture.id !== furnitureId);
  // If the deleted furniture was selected, clear selection
  if (selectedFurnitureId === furnitureId) {
    localSelectedFurnitureId = null;
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
  originalPositions = projectList.map(project => ({
    id: project.id,
    x: project.x,
    y: project.y
  }));
  originalFurniturePositions = furnitureList.map(furniture => ({
    id: furniture.id,
    x: furniture.x,
    y: furniture.y
  }));
}

// Exit room editing mode (discard)
function exitEditMode() {
  isEditingRoom = false;
  selectedEggForMove = null;
  selectedFurnitureForMove = null;
  isDragging = false;
  isMouseDown = false;
  // Restore original positions
  if (originalPositions.length > 0) {
    projectList = projectList.map(project => {
      const original = originalPositions.find(p => p.id === project.id);
      if (original) {
        return { ...project, x: original.x, y: original.y };
      }
      return project;
    });
  }
  if (originalFurniturePositions.length > 0) {
    furnitureList = furnitureList.map(furniture => {
      const original = originalFurniturePositions.find(f => f.id === furniture.id);
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
    // Only update projects that have actually changed position
    const changedProjects = projectList.filter(project => {
      const original = originalPositions.find(p => p.id === project.id);
      return original && (original.x !== project.x || original.y !== project.y);
    });
    
    // Only update furniture that have actually changed position
    const changedFurniture = furnitureList.filter(furniture => {
      const original = originalFurniturePositions.find(f => f.id === furniture.id);
      return original && (original.x !== furniture.x || original.y !== furniture.y);
    });
    
    if (changedProjects.length === 0 && changedFurniture.length === 0) {
      // No changes to save
      isEditingRoom = false;
      selectedEggForMove = null;
      selectedFurnitureForMove = null;
      originalPositions = [];
      originalFurniturePositions = [];
      isSaving = false;
      return;
    }
    
    // Update all changed positions in parallel for better performance
    const updatePromises = [
      ...changedProjects.map(project =>
        fetch('/api/projects', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId: project.id,
            updates: {
              // Airtable stores position as a string "x,y"
              position: `${Math.round(project.x)},${Math.round(project.y)}`
            }
          })
        }).then(response => {
          if (!response.ok) {
            throw new Error(`Failed to update project ${project.id}`);
          }
          return response.json();
        })
      ),
      ...changedFurniture.map(furniture =>
        fetch('/api/furniture', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            furnitureId: furniture.id,
            updates: {
              // Airtable stores position as a string "x,y,flipped"
              position: `${Math.round(furniture.x)},${Math.round(furniture.y)},${furniture.flipped ? '1' : '0'}`
            }
          })
        }).then(response => {
          if (!response.ok) {
            throw new Error(`Failed to update furniture ${furniture.id}`);
          }
          return response.json();
        })
      )
    ];
    
    // Wait for all updates to complete
    await Promise.all(updatePromises);
    
    // Update the position string in projectList to match the saved x,y values
    projectList = projectList.map(project => ({
      ...project,
      position: `${Math.round(project.x)},${Math.round(project.y)}`
    }));
    
    // Update the position string in furnitureList to match the saved x,y,flipped values
    furnitureList = furnitureList.map(furniture => ({
      ...furniture,
      position: `${Math.round(furniture.x)},${Math.round(furniture.y)},${furniture.flipped ? '1' : '0'}`
    }));
    
    console.log(`Successfully saved ${changedProjects.length} project position(s) and ${changedFurniture.length} furniture position(s)`);
    
    // Exit edit mode
    isEditingRoom = false;
    selectedEggForMove = null;
    selectedFurnitureForMove = null;
    originalPositions = [];
    originalFurniturePositions = [];
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
  
  // Apply Y bounds first
  newY = clamp(newY, FLOOR_BOUNDS.topY, FLOOR_BOUNDS.bottomY);
  
  // Get allowed X range based on Y position (rhombus shape)
  const xRange = getAllowedXRange(newY);
  newX = clamp(newX, xRange.minX, xRange.maxX);
  
  // Find the project and update its position
  if (selectedEggForMove) {
    const projectIndex = projectList.findIndex(p => p.id === selectedEggForMove);
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
    const furnitureIndex = furnitureList.findIndex(f => f.id === selectedFurnitureForMove);
    if (furnitureIndex !== -1) {
      furnitureList[furnitureIndex] = {
        ...furnitureList[furnitureIndex],
        x: newX,
        y: newY
      };
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
  
  const project = projectList.find(p => p.id === projectId);
  if (!project) return;
  
  // Get the room container - traverse up to find it
  let roomElement = e.target;
  while (roomElement && !(roomElement instanceof HTMLElement && roomElement.classList.contains('room'))) {
    roomElement = (/** @type {HTMLElement} */ (roomElement)).parentElement;
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
  
  const furniture = furnitureList.find(f => f.id === furnitureId);
  if (!furniture) return;
  
  // Get the room container - traverse up to find it
  let roomElement = e.target;
  while (roomElement && !(roomElement instanceof HTMLElement && roomElement.classList.contains('room'))) {
    roomElement = (/** @type {HTMLElement} */ (roomElement)).parentElement;
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
  if (e.target === e.currentTarget || (e.target instanceof HTMLElement && e.target.classList.contains('room-bg'))) {
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

</script>

<svelte:window onmouseup={handleMouseUp} />

<div 
  class="zlayer room {isEditingRoom ? 'editing' : ''} {isDragging ? 'dragging' : ''}" 
  onclick={() => { 
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

  <img aria-hidden="true" class="room-bg" src="/room_draft.png" />

  <FloorTile></FloorTile>

  {#if (!projectList || projectList.length === 0) && !readOnly}
    <button class="new-project" onclick={(e) => { e.stopPropagation(); isCreateOpen = !isCreateOpen }}>you don't have any projects yet. create something new?</button>
  {/if}

  {#each projectList as project, index}

    <ProjectEgg 
      eggImg={project.egg} 
      bind:projInfo={projectList[index]} 
      x={project.x} 
      y={project.y}
      selected={isEditingRoom ? (selectedEggForMove === project.id) : (selectedEggId === project.id)}
      onSelect={() => selectEggForClick(project.id)}
      onMouseDown={(/** @type {MouseEvent} */ e) => selectEggForDrag(project.id, e)}
      onShowPromptPopup={onShowPromptPopup}
      onDelete={deleteProjectHandler}
      onOpenRouletteSpin={onOpenRouletteSpin}
      user={user}
      isRoomEditing={isEditingRoom}
      readOnly={readOnly}
    />

  {/each}

  {#each furnitureList as furniture, index}

    <FurnitureItem 
      bind:furnitureInfo={furnitureList[index]} 
      x={furniture.x} 
      y={furniture.y}
      selected={isEditingRoom ? (selectedFurnitureForMove === furniture.id) : (selectedFurnitureId === furniture.id)}
      onSelect={() => selectFurnitureForClick(furniture.id)}
      onMouseDown={(/** @type {MouseEvent} */ e) => selectFurnitureForDrag(furniture.id, e)}
      onDelete={deleteFurnitureHandler}
      isRoomEditing={isEditingRoom}
      readOnly={readOnly}
    />

  {/each}

  {#if !hideControls}
    {#if !isEditingRoom}
      <div class="fab-container" onclick={(e) => e.stopPropagation()}>
        <ExpandableButton 
          icon="+" 
          expandedText="create new project" 
          expandedWidth="165px"
          onClick={() => { isCreateOpen = !isCreateOpen }} 
        />

        <ExpandableButton 
          icon="✎"
          expandedText="edit room" 
          expandedWidth="112px"
          onClick={enterEditMode} 
        />
      </div>
    {:else}
      <div class="edit-mode-controls" onclick={(e) => e.stopPropagation()}>
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
</style>

