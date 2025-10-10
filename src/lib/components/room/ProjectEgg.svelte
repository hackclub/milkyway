<script>
  import { slide } from 'svelte/transition';
  import Tooltip from '../Tooltip.svelte';
  import HackatimeSetupPopup from '../HackatimeSetupPopup.svelte';

  let { eggImg, projInfo = $bindable(), x, y, selected = $bindable(false), onSelect, onMouseDown = null, onShowPromptPopup, onDelete, onOpenRouletteSpin = null, user, isRoomEditing = false, readOnly = false} = $props();
  let isEditing = $state(false);
  let isUpdating = $state(false);
  
  // Store original values for discard functionality
  /** @type {{name?: string, description?: string}} */
  let originalValues = $state({});

  // HackaTime projects state
  let hackatimeProjects = $state([]);
  let selectedHackatimeProjects = $state(new Set());
  let isLoadingHackatime = $state(false);
  let currentHackatimeHours = $state(0);
  let hackatimeUserNotFound = $state(false);
  let hasRestoredProjects = $state(false); // Track if we've already restored projects
  let hasAttemptedFetch = $state(false); // Track if we've attempted to fetch projects

  // Delete confirmation state
  let showDeleteConfirm = $state(false);
  let isDeleting = $state(false);

  // HackaTime setup popup state
  let showHackatimeSetup = $state(false);
  
  // Check if project is incomplete roulette
  let isIncompleteRoulette = $derived(() => {
    if (!projInfo.addn) {
      // If no addn field but promptinfo is roulette and no description with results, it's incomplete
      if (projInfo.promptinfo?.toLowerCase() === 'roulette' && 
          (!projInfo.description || !projInfo.description.includes('CAMERA:'))) {
        return true;
      }
      return false;
    }
    
    try {
      const addnData = JSON.parse(projInfo.addn);
      return addnData.rouletteStatus === 'spinning';
    } catch {
      return false;
    }
  });
  
  // Get current roulette progress
  let rouletteProgress = $derived(() => {
    if (!projInfo.addn) {
      // Return empty progress if no addn field
      return { camera: '', gameplay: '', setting: '' };
    }
    try {
      const addnData = JSON.parse(projInfo.addn);
      return addnData.spins || { camera: '', gameplay: '', setting: '' };
    } catch {
      return { camera: '', gameplay: '', setting: '' };
    }
  });



  // Function to update project in Airtable
  async function updateProject(projectId, updates) {
    try {
      isUpdating = true;
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          updates
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        console.error('Failed to update project:', result.error);
        // You could add user notification here
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error updating project:', error);
      // You could add user notification here
      return false;
    } finally {
      isUpdating = false;
    }
  }

  // Start edit mode
  function startEdit() {
    originalValues = {
      name: projInfo.name,
      description: projInfo.description
    };
    isEditing = true;
    // Fetch HackaTime projects when editing starts
    fetchHackatimeProjects();
  }

  // Calculate total hours from selected HackaTime projects
  function calculateSelectedHackatimeHours() {
    let totalHours = 0;
    selectedHackatimeProjects.forEach(selectedProjectName => {
      const project = hackatimeProjects.find(p => p.name === selectedProjectName);
      if (project) {
        totalHours += project.hours;
      }
    });
    return Math.round(totalHours * 100) / 100; // Round to 2 decimal places
  }

  // Save changes
  async function saveChanges() {
    if (!projInfo.id) return;
    
    // Convert selected projects to a comma-separated string
    const selectedProjectsString = Array.from(selectedHackatimeProjects).join(', ');
    
    // Use the current hours count (already calculated)
    const calculatedHours = currentHackatimeHours;
    
    const updates = {
      projectname: projInfo.name,
      description: projInfo.description,
      hackatimeProjects: selectedProjectsString,
      hackatimeHours: calculatedHours
    };
    
    console.log('Saving HackaTime data:', {
      selectedProjects: selectedProjectsString,
      calculatedHours: calculatedHours
    });
    
    const success = await updateProject(projInfo.id, updates);
    if (success) {
      // Update the local projInfo object with the saved values
      projInfo.hackatimeProjects = selectedProjectsString;
      projInfo.totalHours = calculatedHours;
      
      isEditing = false;
      originalValues = {};
      // Clear the selected projects after saving
      selectedHackatimeProjects = new Set();
      // Reset the restoration flag so next edit can restore from database
      hasRestoredProjects = false;
    }
  }

  // Discard changes
  function discardChanges() {
    projInfo.name = originalValues.name || '';
    projInfo.description = originalValues.description || '';
    isEditing = false;
    originalValues = {};
    // Clear the selected projects when discarding
    selectedHackatimeProjects = new Set();
    // Reset the restoration flag so next edit can restore from database
    hasRestoredProjects = false;
  }

  // Add art hours function (placeholder)
  function addArtHours() {
    // TODO: Implement add art hours functionality
    console.log('Add art hours clicked for project:', projInfo.id);
  }

  function shipProject() {
    // TODO: Implement ship project functionality
    console.log('Ship project clicked for project:', projInfo.id);
  }

  // Delete project function
  async function deleteProject() {
    if (!projInfo.id || !onDelete) return;
    
    try {
      isDeleting = true;
      const response = await fetch('/api/projects', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: projInfo.id
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Call the parent's delete handler to remove from list
        onDelete(projInfo.id);
        showDeleteConfirm = false;
      } else {
        console.error('Failed to delete project:', result.error);
        // You could add user notification here
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      // You could add user notification here
    } finally {
      isDeleting = false;
    }
  }

  // Show delete confirmation
  function confirmDelete() {
    showDeleteConfirm = true;
  }

  // Cancel delete
  function cancelDelete() {
    showDeleteConfirm = false;
  }

  // Open HackaTime setup popup
  function openHackatimeSetup() {
    showHackatimeSetup = true;
  }

  // Close HackaTime setup popup
  function closeHackatimeSetup() {
    showHackatimeSetup = false;
  }

  // Fetch HackaTime projects for this project
  async function fetchHackatimeProjects() {
    if (!projInfo.created || !user?.email) return;
    
    try {
      isLoadingHackatime = true;
      hackatimeUserNotFound = false; // Reset the error state
      hasAttemptedFetch = true; // Mark that we've attempted to fetch
      const email = user.email;
      
      // Calculate start date as project creation date minus 1 week
      const projectCreatedDate = new Date(projInfo.created);
      const oneWeekAgo = new Date(projectCreatedDate);
      oneWeekAgo.setDate(projectCreatedDate.getDate() - 7);
      const startDate = oneWeekAgo.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      console.log('HackaTime start date:', {
        projectCreated: projInfo.created,
        startDate: startDate
      });
      
      const response = await fetch('/api/get-hackatime-projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, startDate })
      });

      const result = await response.json();
      
      console.log('HackaTime API response status:', response.status);
      console.log('HackaTime API response result:', result);
      
      console.log('HackaTime API response:', {
        success: result.success,
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : 'no data',
        error: result.error,
        userNotFound: result.userNotFound,
        fullResult: result
      });
      
      // Check for 404 status or userNotFound flag
      if (response.status === 404 || result.userNotFound === true) {
        hackatimeUserNotFound = true;
        hackatimeProjects = [];
        return;
      }
      
      if (result.success && result.data) {
        // Check if projects exist in the data (could be different structure)
        const projects = result.data.data.projects || result.data.data;
        if (projects && Array.isArray(projects)) {
          console.log('HackaTime projects found:', projects.length);
          hackatimeProjects = projects.map(project => ({
            name: project.name,
            hours: Math.round(project.total_seconds / 3600 * 100) / 100 // Convert seconds to hours
          }));
          
          // Restore selected projects from Airtable only if we haven't already done so
          if (!hasRestoredProjects) {
            restoreSelectedProjects();
            hasRestoredProjects = true;
          }
        } else {
          console.log('No projects array found in data:', result.data);
          hackatimeProjects = [];
        }
      } else {
        console.error('HackaTime API error details:', {
          success: result.success,
          error: result.error,
          data: result.data,
          response: result,
          userNotFound: result.userNotFound
        });
        
        // Check if it's a "User not found" error using the new flag
        if (result.userNotFound === true) {
          hackatimeUserNotFound = true;
        }
        
        hackatimeProjects = [];
      }
    } catch (error) {
      console.error('Error fetching HackaTime projects:', error);
      
      // Check if it's a "User not found" error in the catch block too
      if (error instanceof Error && error.message && error.message.includes('HTTP error! status: 404') && 
          error.message.includes('"error":"User not found"')) {
        hackatimeUserNotFound = true;
      }
      
      hackatimeProjects = [];
    } finally {
      isLoadingHackatime = false;
    }
  }

  // Restore selected projects from Airtable
  function restoreSelectedProjects() {
    if (!projInfo.hackatimeProjects) return;
    
    // Parse the stored hackatimeProjects string
    try {
      if (projInfo.hackatimeProjects && typeof projInfo.hackatimeProjects === 'string') {
        const storedProjectNames = projInfo.hackatimeProjects.split(', ').filter(name => name.trim());
        selectedHackatimeProjects = new Set(storedProjectNames);
      } else if (Array.isArray(projInfo.hackatimeProjects)) {
        // Handle case where it's already an array
        selectedHackatimeProjects = new Set(projInfo.hackatimeProjects.filter(name => name && name.trim()));
      }
    } catch {
      selectedHackatimeProjects = new Set();
    }
    
    // Update the hours count and totalHours
    updateCurrentHours();
    
    console.log('Restored selected projects:', {
      projects: Array.from(selectedHackatimeProjects),
      hours: currentHackatimeHours,
      totalHours: projInfo.totalHours
    });
  }

  // Update current hours count
  function updateCurrentHours() {
    currentHackatimeHours = calculateSelectedHackatimeHours();
    // Also update the projInfo.totalHours to reflect changes in real-time
    projInfo.totalHours = currentHackatimeHours;
  }

  // Toggle HackaTime project selection
  function toggleHackatimeProject(projectName) {
    if (selectedHackatimeProjects.has(projectName)) {
      selectedHackatimeProjects.delete(projectName);
    } else {
      selectedHackatimeProjects.add(projectName);
    }
    selectedHackatimeProjects = new Set(selectedHackatimeProjects); // Trigger reactivity
    
    // Update hours count immediately
    updateCurrentHours();
  }
  
  // Open roulette spin wheel to continue spinning
  function continueRouletteSpinning() {
    if (onOpenRouletteSpin) {
      onOpenRouletteSpin(projInfo.id, rouletteProgress());
    }
  }

</script>


<div class="project-egg {selected ? 'selected' : ''} {isIncompleteRoulette() ? 'incomplete-roulette-egg' : ''} {isRoomEditing ? 'editing-mode' : ''}" style:--x={x} style:--y={y} style:--z={Math.round(y)} onclick={(e) => e.stopPropagation()}>
<img class="egg-img" src={eggImg} alt="Project egg" />

<button 
  class="egg-svg" 
  onclick={() => { if (onSelect) onSelect(); }} 
  onmousedown={(e) => { if (isRoomEditing && onMouseDown) { e.stopPropagation(); onMouseDown(e); } }}
  aria-label="Toggle project details"
>
  <img src="/projects/egg_shape.svg" alt="Project egg shape" />
</button>

{#if isIncompleteRoulette()}
  <div class="incomplete-badge">!</div>
{/if}

{#if selected && !isRoomEditing}
<div class="project-info" transition:slide={{duration: 200}}>

  <div class="project-header">
    <div class="project-main-info">
      <div class="project-meta">
        <span class="hours-info">{projInfo.totalHours || 0} hours</span>
        <span class="separator">·</span>
        <button class="prompt-info-link" onclick={() => onShowPromptPopup(projInfo.promptinfo, rouletteProgress())}>{projInfo.promptinfo}</button>
      </div>
      {#if isEditing}
        <input class="project-name" bind:value={projInfo.name} placeholder="your game name..." />
      {:else}
        <div class="project-name-display">{projInfo.name || 'Untitled Project'}</div>
      {/if}
    </div>
    <img class="project-avatar" src="/pfp_placeholder.png" alt="Project avatar" />
  </div>

  {#if isEditing}
    <textarea class="project-desc" bind:value={projInfo.description} placeholder="what's your game about?"></textarea>
    
    <!-- HackaTime Projects Section -->
    <div class="hackatime-section">
      <div class="hackatime-header">
        <h5 class="hackatime-title">hackatime projects</h5>
        <div class="hackatime-total">total: {currentHackatimeHours}h</div>
      </div>
      {#if isLoadingHackatime}
        <div class="hackatime-loading">loading projects...</div>
      {:else if hackatimeUserNotFound}
        <div class="hackatime-empty">no hackatime user found. <button class="hackatime-setup-link" onclick={openHackatimeSetup}>let's set up hackatime!</button></div>
      {:else if hackatimeProjects.length > 0}
        <div class="hackatime-projects-list">
          {#each hackatimeProjects as project}
            <label class="hackatime-project-item">
              <input 
                type="checkbox" 
                checked={selectedHackatimeProjects.has(project.name)}
                onchange={() => toggleHackatimeProject(project.name)}
              />
              <span class="project-name">{project.name}</span>
              <span class="project-hours">{project.hours}h</span>
            </label>
          {/each}
        </div>
      {:else}
        <div class="hackatime-empty">no hackatime projects found for this time. <button class="hackatime-setup-link" onclick={openHackatimeSetup}>start coding!</button></div>
      {/if}
    </div>
  {:else}
    {#if isIncompleteRoulette()}
      <!-- Incomplete roulette project -->
      <div class="incomplete-roulette">
        <p class="incomplete-roulette-title">⚡ Roulette in progress!</p>
        <p class="incomplete-roulette-desc">{readOnly ? 'This project is still being spun...' : 'Click below to spin your wheels'}</p>
        
        <div class="roulette-progress">
          <div class="progress-item {rouletteProgress()?.camera ? 'complete' : ''}">
            {rouletteProgress()?.camera ? '✓ ' : '○ '}Camera{rouletteProgress()?.camera ? `: ${rouletteProgress()?.camera}` : ''}
          </div>
          <div class="progress-item {rouletteProgress()?.gameplay ? 'complete' : ''}">
            {rouletteProgress()?.gameplay ? '✓ ' : '○ '}Gameplay{rouletteProgress()?.gameplay ? `: ${rouletteProgress()?.gameplay}` : ''}
          </div>
          <div class="progress-item {rouletteProgress()?.setting ? 'complete' : ''}">
            {rouletteProgress()?.setting ? '✓ ' : '○ '}Setting{rouletteProgress()?.setting ? `: ${rouletteProgress()?.setting}` : ''}
          </div>
        </div>
        
        {#if !readOnly}
          <button class="continue-spinning-btn" onclick={continueRouletteSpinning}>
            Continue Spinning
          </button>
        {/if}
      </div>
    {:else if projInfo.promptinfo?.toLowerCase() === 'roulette' && projInfo.addn}
      <!-- Display completed roulette results from addn (immutable) -->
      {#if rouletteProgress()?.camera && rouletteProgress()?.gameplay && rouletteProgress()?.setting}
        <!-- Show user's description first -->
        <p class="project-desc-display">{projInfo.description || 'no description yet... change this!'}</p>
        
        <!-- Then show roulette results from immutable addn -->
        <div class="roulette-results" style="margin-top: 12px;">
          <div class="roulette-result-item">
            <span class="roulette-category">CAMERA:</span>
            <span class="roulette-value">{rouletteProgress()?.camera}</span>
          </div>
          <div class="roulette-result-item">
            <span class="roulette-category">GAMEPLAY:</span>
            <span class="roulette-value">{rouletteProgress()?.gameplay}</span>
          </div>
          <div class="roulette-result-item">
            <span class="roulette-category">SETTING:</span>
            <span class="roulette-value">{rouletteProgress()?.setting}</span>
          </div>
        </div>
      {/if}
    {:else}
      <p class="project-desc-display">{projInfo.description || 'no description yet... change this!'}</p>
    {/if}
    
    <!-- HackaTime warning when no projects are associated with this project (only show if not read-only) -->
    {#if !readOnly && ((!isEditing && (!projInfo.hackatimeProjects || (typeof projInfo.hackatimeProjects === 'string' && projInfo.hackatimeProjects.trim() === '') || (Array.isArray(projInfo.hackatimeProjects) && projInfo.hackatimeProjects.length === 0))) || (isEditing && selectedHackatimeProjects.size === 0))}
      <div class="hackatime-warning">
        <span class="warning-icon">⚠️</span>
        <span class="warning-text">no hackatime projects associated!</span>
      </div>
    {/if}
  {/if}

  <!-- Only show action buttons if not read-only -->
  {#if !readOnly}
    <div class="project-actions">
      {#if isEditing}
        <div class="edit-actions-left">
          <button class="save-btn" onclick={saveChanges} disabled={isUpdating}>
            {isUpdating ? 'Saving...' : 'Save'}
          </button>
          <button class="discard-btn" onclick={discardChanges} disabled={isUpdating}>Discard</button>
        </div>
        <div class="edit-actions-right">
          <button class="delete-btn" onclick={confirmDelete} disabled={isUpdating || isDeleting}>Delete project</button>
        </div>
      {:else}
        <button class="edit-btn" onclick={startEdit}>Edit details</button>
        <Tooltip text="coming soon!">
          <button class="add-hours-btn disabled" onclick={addArtHours}>Create artlog</button>
        </Tooltip>
        <Tooltip text="coming soon!">
          <button class="ship-btn disabled" onclick={shipProject}>Ship project 💫</button>
        </Tooltip>
      {/if}
    </div>
  {/if}

</div>
{/if}
</div>

<!-- Delete Confirmation Popup - Outside egg container for proper positioning -->
{#if showDeleteConfirm}
  <div class="delete-confirm-overlay" onclick={cancelDelete}>
    <div class="delete-confirm-popup" onclick={(e) => e.stopPropagation()}>
      <h3>Delete Project</h3>
      <p>Are you sure you want to delete "{projInfo.name || 'Untitled Project'}"? This action cannot be undone.</p>
      <div class="delete-confirm-actions">
        <button class="cancel-delete-btn" onclick={cancelDelete} disabled={isDeleting}>Cancel</button>
        <button class="confirm-delete-btn" onclick={deleteProject} disabled={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- HackaTime Setup Popup -->
<HackatimeSetupPopup showPopup={showHackatimeSetup} onClose={closeHackatimeSetup} />




<style>

.project-egg {
  height: 8%;
  position: absolute;
  z-index: calc(100 + var(--z));

  display: flex;
  justify-content: center;
  align-items: center;

  transform: translate(calc(var(--x) * 1px), calc(var(--y) * 1px ));
}

.project-egg.selected {
  z-index: calc(1000 + var(--z));
}

.project-egg.editing-mode {
  cursor: grab;
}

.project-egg.editing-mode.selected {
  cursor: grab;
}

.project-egg.editing-mode.selected .egg-img {
  filter: drop-shadow(-1.5px -1.5px 0 var(--orange)) drop-shadow(1.5px -1.5px 0 var(--orange)) drop-shadow(-1.5px 1.5px 0 var(--orange)) drop-shadow(1.5px 1.5px 0 var(--orange));
  pointer-events: none;
}

.egg-img {
  height: 100%;
  position: absolute;

  transition: filter 0.2s;
}

.egg-svg {
  height: 75%;
  position: absolute;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.project-egg.editing-mode .egg-svg {
  cursor: move;
}

.egg-svg img {
  height: 100%;
  width: auto;
}

.project-egg:has(.egg-svg:hover) .egg-img, .project-egg.selected .egg-img {
  filter: drop-shadow(-1.5px -1.5px 0 var(--orange)) drop-shadow(1.5px -1.5px 0 var(--orange)) drop-shadow(-1.5px 1.5px 0 var(--orange)) drop-shadow(1.5px 1.5px 0 var(--orange));

}

.project-info {
  position: absolute;
  border: 4px solid var(--orange);
  border-radius: 8px;
  background: var(--yellow);

  left: calc(100% + 50px);
  top: 50%;
  transform: translateY(-50%);

  padding: 12px;
  width: 30vw;
  z-index: 1500;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.project-main-info {
  flex: 1;
}

.project-meta {
  font-size: 0.8em;
  opacity: 0.5;
  margin-bottom: 4px;
}

.hours-info {
  font-weight: normal;
}

.prompt-info-link {
  background: none;
  border: none;
  padding: 0;
  font-size: inherit;
  font-family: inherit;
  color: inherit;
  opacity: 0.5;
  cursor: pointer;
  text-decoration: underline;
  transition: opacity 0.2s;
}

.prompt-info-link:hover {
  opacity: 1;
}



.project-avatar {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.project-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: space-between;
  align-items: center;
}

.edit-actions-left {
  display: flex;
  gap: 8px;
}

.edit-actions-right {
  display: flex;
  gap: 8px;
}

/* Reset margins for consistent spacing */
p, input, textarea {
  margin: 0;
}

input, textarea {
  background-color: transparent;
  outline: none;
  border: none;
  padding: 0;
  border-bottom: 4px solid transparent;
  font-family: inherit;
  font-weight: normal;
  transition: border-bottom 0.2s;
  box-sizing: border-box;
  width: 100%;
  resize: vertical;
}

input:hover, textarea:hover {
  border-bottom: 4px solid var(--orange);
}

.project-name {
  font-size: 1em;
  font-weight: bold;
  color: black;
  margin-bottom: 4px;
}

.project-desc {
  font-size: 1em;
  line-height: 1.4;
  color: #333;
  min-height: 40px;
  max-height: 120px;
  margin-bottom: 12px;
}

.project-name-display {
  font-size: 1.2em;
  margin: 0 0 4px 0;
  color: black;
}

.project-desc-display {
  font-size: 1em;
  margin: 0 0 12px 0;
  line-height: 1.4;
  color: #333;
  min-height: 40px;
}


/* Button styles */
.edit-btn, .save-btn, .discard-btn, .delete-btn, .add-hours-btn, .ship-btn {
  padding: 4px 8px;
  border: 2px solid var(--orange);
  border-radius: 4px;
  background: var(--yellow);
  color: var(--orange);
  font-family: inherit;
  font-size: 0.8em;
  font-weight: normal;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn:hover, .save-btn:hover, .discard-btn:hover, .add-hours-btn:hover {
  background: var(--orange);
  color: white;
}

.save-btn:disabled, .discard-btn:disabled, .delete-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.discard-btn {
  background: #ff6b6b;
  border-color: #ff6b6b;
  color: white;
}

.discard-btn:hover:not(:disabled) {
  background: #ff5252;
  border-color: #ff5252;
}

.delete-btn {
  background: #dc3545;
  border-color: #dc3545;
  color: white;
}

.delete-btn:hover:not(:disabled) {
  background: #c82333;
  border-color: #c82333;
}

.add-hours-btn {
  background: var(--orange);
  border-color: var(--orange);
  color: white;
}

.add-hours-btn:hover {
  background: #e67e00;
  border-color: #e67e00;
}


.ship-btn {
  background: #7FA9DB;
  border-color: #7FA9DB;
  color: white;
} 

.ship-btn:hover {
  background: #11172A;
  border-color: #11172A;
}

/* Disabled button styles */
.add-hours-btn.disabled, .ship-btn.disabled {
  background: #ccc;
  border-color: #ccc;
  color: #999;
  cursor: not-allowed;
  opacity: 0.6;
}

.add-hours-btn.disabled:hover, .ship-btn.disabled:hover {
  background: #ccc;
  border-color: #ccc;
  color: #999;
}


/* HackaTime Projects Section */
.hackatime-section {
  margin: 12px 0;
  padding: 8px;
  border: 2px solid var(--orange);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
}

.hackatime-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.hackatime-title {
  margin: 0;
  font-size: 0.9em;
  color: var(--orange);
  font-weight: bold;
}

.hackatime-total {
  font-size: 0.8em;
  color: var(--orange);
  font-weight: bold;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 3px;
}

.hackatime-projects-list {
  max-height: 120px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hackatime-project-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  cursor: pointer;
  border-radius: 2px;
  transition: background-color 0.2s;
}

.hackatime-project-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.hackatime-project-item input[type="checkbox"] {
  margin: 0;
  width: auto;
  flex-shrink: 0;
}

.hackatime-project-item .project-name {
  flex: 1;
  font-size: 0.8em;
  color: #333;
  font-weight: normal;
}

.hackatime-project-item .project-hours {
  font-size: 0.7em;
  color: var(--orange);
  font-weight: bold;
  flex-shrink: 0;
}

.hackatime-loading, .hackatime-empty {
  font-size: 0.8em;
  color: #666;
  text-align: center;
  padding: 8px;
  font-style: italic;
}

.hackatime-setup-link {
  background: none;
  border: none;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  font-style: inherit;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.2s;
  padding: 0;
  margin: 0;
}

.hackatime-setup-link:hover {
  color: var(--orange);
}

/* HackaTime Warning */
.hackatime-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0;
  padding: 6px 8px;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 4px;
  font-size: 0.8em;
}

.warning-icon {
  font-size: 0.9em;
}

.warning-text {
  color: #856404;
  font-weight: 500;
}

/* Delete Confirmation Popup */
.delete-confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.delete-confirm-popup {
  background: var(--yellow);
  border: 4px solid var(--orange);
  border-radius: 12px;
  padding: 24px;
  max-width: 450px;
  width: 90%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  position: relative;
}

.delete-confirm-popup h3 {
  margin: 0 0 12px 0;
  color: var(--orange);
  font-size: 1.2em;
}

.delete-confirm-popup p {
  margin: 0 0 16px 0;
  color: #333;
  line-height: 1.4;
}

.delete-confirm-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.cancel-delete-btn, .confirm-delete-btn {
  padding: 6px 12px;
  border: 2px solid;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9em;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-delete-btn {
  background: var(--yellow);
  border-color: var(--orange);
  color: var(--orange);
}

.cancel-delete-btn:hover:not(:disabled) {
  background: var(--orange);
  color: white;
}

.confirm-delete-btn {
  background: #dc3545;
  border-color: #dc3545;
  color: white;
}

.confirm-delete-btn:hover:not(:disabled) {
  background: #c82333;
  border-color: #c82333;
}

.cancel-delete-btn:disabled, .confirm-delete-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Roulette Results Display */
.roulette-results {
  margin: 12px 0;
  padding: 12px;
  background: rgba(237, 115, 139, 0.1);
  border: 2px solid #ED738B;
  border-radius: 6px;
}

.roulette-result-item {
  display: flex;
  gap: 8px;
  margin: 6px 0;
  align-items: baseline;
}

.roulette-category {
  font-weight: bold;
  color: #ED738B;
  font-size: 0.85em;
  text-transform: uppercase;
  min-width: 90px;
}

.roulette-value {
  color: #333;
  font-size: 1em;
  flex: 1;
}

/* Incomplete Roulette Display */
.incomplete-roulette {
  margin: 12px 0;
  padding: 12px;
  background: rgba(255, 193, 7, 0.1);
  border: 2px solid #FFC107;
  border-radius: 6px;
  text-align: center;
}

.incomplete-roulette-title {
  font-weight: bold;
  color: #856404;
  font-size: 1.1em;
  margin: 0 0 4px 0;
}

.incomplete-roulette-desc {
  color: #856404;
  font-size: 0.85em;
  margin: 0 0 12px 0;
}

.roulette-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 12px 0;
}

.progress-item {
  font-size: 0.85em;
  color: #666;
  text-align: left;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 3px;
}

.progress-item.complete {
  color: #28a745;
  font-weight: bold;
}

.continue-spinning-btn {
  padding: 8px 16px;
  background: #ED738B;
  color: white;
  border: 2px solid #ED738B;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9em;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.continue-spinning-btn:hover {
  background: #FF698A;
  border-color: #FF698A;
  transform: translateY(-2px);
}

/* Incomplete Roulette Egg Indicator */
.incomplete-roulette-egg .egg-img {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    filter: drop-shadow(0 0 5px #FFC107) drop-shadow(0 0 10px #FFC107);
  }
  50% {
    filter: drop-shadow(0 0 15px #FFC107) drop-shadow(0 0 25px #FFC107);
  }
}

.incomplete-badge {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 30px;
  height: 30px;
  background: #FFC107;
  color: #000;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.2em;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 200;
  animation: bounce-badge 1s ease-in-out infinite;
}

@keyframes bounce-badge {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}
</style>
