<script>
  import { slide } from 'svelte/transition';

  let { eggImg, projInfo = $bindable(), x, y} = $props();

  let selected = $state(false);
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

  // Run on component mount to check hackatimeHours
  $effect(() => {
    if (projInfo.id && projInfo.hackatimeProjects && hackatimeProjects.length > 0) {
      checkAndUpdateHackatimeHours();
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
      isEditing = false;
      originalValues = {};
      // Clear the selected projects after saving
      selectedHackatimeProjects = new Set();
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

  // Fetch HackaTime projects for this project
  async function fetchHackatimeProjects() {
    if (!projInfo.created) return;
    
    try {
      isLoadingHackatime = true;
      const email = "bucketfishy@gmail.com"; // You'll need to get the actual user email
      
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
      
      console.log('HackaTime API response:', {
        success: result.success,
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : 'no data',
        error: result.error,
        fullResult: result
      });
      
      if (result.success && result.data) {
        // Check if projects exist in the data (could be different structure)
        const projects = result.data.data.projects || result.data.data;
        if (projects && Array.isArray(projects)) {
          console.log('HackaTime projects found:', projects.length);
          hackatimeProjects = projects.map(project => ({
            name: project.name,
            hours: Math.round(project.total_seconds / 3600 * 100) / 100 // Convert seconds to hours
          }));
          
          // Restore selected projects from Airtable
          restoreSelectedProjects();
          
          // Check and update hackatimeHours after loading projects
          await checkAndUpdateHackatimeHours();
        } else {
          console.log('No projects array found in data:', result.data);
          hackatimeProjects = [];
        }
      } else {
        console.error('HackaTime API error details:', {
          success: result.success,
          error: result.error,
          data: result.data,
          response: result
        });
        hackatimeProjects = [];
      }
    } catch (error) {
      console.error('Error fetching HackaTime projects:', error);
      hackatimeProjects = [];
    } finally {
      isLoadingHackatime = false;
    }
  }

  // Restore selected projects from Airtable
  function restoreSelectedProjects() {
    if (!projInfo.hackatimeProjects) return;
    
    // Parse the stored hackatimeProjects string
    const storedProjectNames = projInfo.hackatimeProjects.split(', ').filter(name => name.trim());
    selectedHackatimeProjects = new Set(storedProjectNames);
    
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

  // Check and update hackatimeHours based on selected projects
  async function checkAndUpdateHackatimeHours() {
    if (!projInfo.id || !projInfo.hackatimeProjects) return;
    
    // Parse the stored hackatimeProjects string
    const storedProjectNames = projInfo.hackatimeProjects.split(', ').filter(name => name.trim());
    if (storedProjectNames.length === 0) return;
    
    // Calculate total hours from stored projects
    let totalHours = 0;
    storedProjectNames.forEach(projectName => {
      const project = hackatimeProjects.find(p => p.name === projectName);
      if (project) {
        totalHours += project.hours;
      }
    });
    
    const calculatedHours = Math.round(totalHours * 100) / 100;
    const currentHours = projInfo.hackatimeHours || 0;
    
    // Update if the calculated hours don't match the stored hours
    if (Math.abs(calculatedHours - currentHours) > 0.01) { // Small tolerance for floating point
      console.log('Updating hackatimeHours:', {
        current: currentHours,
        calculated: calculatedHours,
        projects: storedProjectNames
      });
      
      const updates = {
        hackatimeHours: calculatedHours
      };
      
      const success = await updateProject(projInfo.id, updates);
      if (success) {
        projInfo.hackatimeHours = calculatedHours;
      }
    }
  }
</script>


<div class="project-egg {selected ? 'selected' : ''}" style:--x={x} style:--y={y} >
<img class="egg-img" src={eggImg} alt="Project egg" />

<button class="egg-svg" onclick={() => selected = !selected } aria-label="Toggle project details">
  <img src="/projects/egg_shape.svg" alt="Project egg shape" />
</button>

{#if selected}
<div class="project-info" transition:slide={{duration: 200}}>

  <div class="project-header">
    <div class="project-main-info">
      <div class="project-meta">
        <span class="hours-info">{projInfo.totalHours || 0} hours</span>
        <span class="separator">·</span>
        <span class="prompt-info">{projInfo.promptinfo}</span>
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
        <h5 class="hackatime-title">Hackatime Projects</h5>
        <div class="hackatime-total">Total: {currentHackatimeHours}h</div>
      </div>
      {#if isLoadingHackatime}
        <div class="hackatime-loading">Loading projects...</div>
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
        <div class="hackatime-empty">No Hackatime projects found for this period</div>
      {/if}
    </div>
  {:else}
    <p class="project-desc-display">{projInfo.description || 'No description yet... change this!'}</p>
  {/if}

  <div class="project-actions">
    {#if isEditing}
      <button class="save-btn" onclick={saveChanges} disabled={isUpdating}>
        {isUpdating ? 'Saving...' : 'Save'}
      </button>
      <button class="discard-btn" onclick={discardChanges} disabled={isUpdating}>Discard</button>
    {:else}
      <button class="edit-btn" onclick={startEdit}>Edit details</button>
      <button class="add-hours-btn" onclick={addArtHours}>Create artlog</button>
      <button class="ship-btn" onclick={shipProject}>Ship project 💫</button>
    {/if}
  </div>

</div>
{/if}
</div>




<style>

.project-egg {
  height: 8%;
  position: absolute;
  

  display: flex;
  justify-content: center;
  align-items: center;

  transform: translate(var(--x), var(--y));
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

.egg-svg img {
  height: 100%;
  width: auto;
}

.project-egg:has(.egg-svg:hover) .egg-img, .project-egg.selected .egg-img {
  filter: drop-shadow(-1.5px -1.5px 0 var(--orange)) drop-shadow(1.5px -1.5px 0 var(--orange)) drop-shadow(-1.5px 1.5px 0 var(--orange)) drop-shadow(1.5px 1.5px 0 var(--orange)) drop-shadow(0 0 3px white);

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
.edit-btn, .save-btn, .discard-btn, .add-hours-btn, .ship-btn {
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

.save-btn:disabled, .discard-btn:disabled {
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
</style>
