<script>
  import { slide } from 'svelte/transition';

  let { eggImg, projInfo = $bindable(), x, y} = $props();

  let selected = $state(false);
  let isEditing = $state(false);
  let isUpdating = $state(false);
  
  // Store original values for discard functionality
  let originalValues = $state({});

  // Test function for hackatime API
  async function testHackaTime() {
    try {
      // Using a placeholder email - you'll need to get the actual user email
      const email = "bucketfishy@gmail.com";
      const date = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format
      
      const response = await fetch('/api/get-hackatime-projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, date })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('HackaTime API response:', result.data);
      } else {
        console.error('HackaTime API error:', result.error);
      }
    } catch (error) {
      console.error('HackaTime API error:', error);
    }
  }

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
  }

  // Save changes
  async function saveChanges() {
    if (!projInfo.id) return;
    
    const updates = {
      projectname: projInfo.name,
      promptinfo: projInfo.promptinfo,
      description: projInfo.description
    };
    
    const success = await updateProject(projInfo.id, updates);
    if (success) {
      isEditing = false;
      originalValues = {};
    }
  }

  // Discard changes
  function discardChanges() {
    projInfo.name = originalValues.name || '';
    projInfo.description = originalValues.description || '';
    isEditing = false;
    originalValues = {};
  }
</script>


<div class="project-egg {selected ? 'selected' : ''}" style:--x={x} style:--y={y} >
<img class="egg-img" src={eggImg} alt="Project egg" />

<img class="egg-svg" src="/projects/egg_shape.svg" onclick={() => selected = !selected } />

{#if selected}
<div class="project-info" transition:slide={{duration: 200}}>

  <div class="project-fields">

    <div class="project-name-container">
      {#if isEditing}
        <input class="project-name" bind:value={projInfo.name} placeholder="your game name..." />
      {:else}
        <h4 class="project-name-display">{projInfo.name || 'Untitled Project'}</h4>
      {/if}

      {#if isEditing}
        <button class="save-btn" onclick={saveChanges} disabled={isUpdating}>
          {isUpdating ? 'Saving...' : 'Save'}
        </button>
        <button class="discard-btn" onclick={discardChanges} disabled={isUpdating}>Discard</button>
      
      {:else}
        <button class="edit-btn" onclick={startEdit}>Edit</button>
      {/if}
    </div>

    {#if isEditing}
      <textarea class="project-desc" bind:value={projInfo.description} placeholder="what's your game about?"></textarea>
    {:else}
      <div class="project-desc-display-container">
      <p class="project-desc-display">{projInfo.description || 'No description yet... change this!'}</p>
      </div>
    {/if}


    
    <p class="prompt-info">{projInfo.promptinfo}</p>
  </div>

  <button class="test-hackatime-btn" onclick={testHackaTime}>Test HackaTime</button>
</div>
{/if}
</div>




<style>

.project-egg {
  height: 8%;
  position: absolute;
  cursor: pointer;

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
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--orange);
}

.project-title {
  margin: 0;
  font-size: 1.2em;
  color: var(--orange);
}

.project-actions {
  display: flex;
  gap: 8px;
}

.project-fields {
  margin-bottom: 16px;
}

p, input, textarea {
  margin: 8px 0;
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
  font-size: 1.4em;
}

.project-desc {
  font-size: 1em;
  min-height: 60px;
  max-height: 120px;
}

.project-name-display {
  font-size: 1.4em;
  margin: 8px 0;
  color: var(--orange);
  font-weight: bold;
}

.project-desc-display {
  font-size: 1em;
  margin: 8px 0;
  line-height: 1.4;
  color: #333;
  min-height: 60px;
}

.prompt-info {
  font-size: 0.8em;
  opacity: 50%;
}

/* Button styles */
.edit-btn, .save-btn, .discard-btn {
  padding: 6px 12px;
  border: 2px solid var(--orange);
  border-radius: 4px;
  background: var(--yellow);
  color: var(--orange);
  font-family: inherit;
  font-size: 0.9em;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn:hover, .save-btn:hover, .discard-btn:hover {
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


.test-hackatime-btn {
  background: var(--orange);
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.8em;
  margin-top: 8px;
  transition: background-color 0.2s;
}

.test-hackatime-btn:hover {
  background: #e67e00;
}
</style>
