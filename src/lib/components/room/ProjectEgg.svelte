<script>
  import { slide } from 'svelte/transition';
  import { debounce } from '$lib/utils/debounce.js';

  let { eggImg, projInfo = $bindable(), x, y} = $props();

  let selected = $state(false);
  let isUpdating = $state(false);

  // Debounced function to update project in Airtable
  const updateProject = debounce(async (projectId, updates) => {
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
      }
    } catch (error) {
      console.error('Error updating project:', error);
      // You could add user notification here
    } finally {
      isUpdating = false;
    }
  }, 1000); // 1 second debounce

  // Watch for changes in projInfo and update Airtable
  $effect(() => {
    if (projInfo && projInfo.id) {
      // Only update if we have a valid project ID (not a new project)
      const updates = {
        projectname: projInfo.name,
        promptinfo: projInfo.promptinfo,
        description: projInfo.description
      };
      
      updateProject(projInfo.id, updates);
    }
  });
</script>


<div class="project-egg {selected ? 'selected' : ''}" style:--x={x} style:--y={y} >
<img class="egg-img" src={eggImg} alt="Project egg" />

<img class="egg-svg" src="/projects/egg_shape.svg" onclick={() => selected = !selected } />

{#if selected}
<div class="project-info" transition:slide={{duration: 200}}>
<input class="project-name" bind:value={projInfo.name} />
<p class="prompt-info">{projInfo.promptinfo}</p>
<p class="project-desc">{projInfo.description}</p>

{#if isUpdating}
<div class="update-indicator">Saving...</div>
{/if}
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

p, input {
  margin: 8px 0;
}

input {
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
}

input:hover {
  border-bottom: 4px solid var(--orange);
}

.project-name {
  font-size: 1.4em;
}

.prompt-info {
  font-size: 0.8em;
  opacity: 50%;
}

.update-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--orange);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7em;
  font-weight: bold;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
