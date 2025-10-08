<script>
    import { fly, fade } from 'svelte/transition';
    import SpinWheel from './prompts/roulette/SpinWheel.svelte';
    import Tooltip from './Tooltip.svelte';
    import { promptData } from '$lib/data/prompt-data.js';


    let { onClose, projectList = $bindable() } = $props();

    let promise = $state(null);

    let selectedEvent = $state(/** @type {string | null} */ (null));
    let showSpinWheel = $state(false);


    let promptChosen = $state(false);
    let isCreating = $state(false);
    let errorMessage = $state(/** @type {string | null} */ (null));

    // Use the shared prompt data
    let eventNames = promptData;

    // what happens once you create a project with a certain promopt
    async function handleStartProject() {
        if (selectedEvent === 'roulette') {
            showSpinWheel = true;
        } else {
            // if it doesn't need custom logic before starting
            console.log('Starting project:', selectedEvent);
            isCreating = true;
            errorMessage = null;

            try {
                // Create project via API
                const response = await fetch('/api/projects', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },

                    // update this in the future, if required — specifically for egg.
                    body: JSON.stringify({
                        name: 'untitled game!',
                        description: `${eventNames[selectedEvent || 'new']?.name.toLowerCase() || selectedEvent?.toLowerCase() || 'custom'}`,
                        egg: 'projects/sparkle_egg1.png'
                    })
                });

                const result = await response.json();


                if (result.success) {
                    // Add to local project list optimistically
                    projectList.push(result.project);
                    promptChosen = true;
                } else {
                    errorMessage = result.error || 'Failed to create project';
                    console.error('Failed to create project:', result.error);
                }
            } catch (error) {
                errorMessage = 'Network error. Please try again.';
                console.error('Error creating project:', error);
            } finally {
                isCreating = false;
            }

            if (!errorMessage) {
                setTimeout(() => {
                    onClose();
                }, 1700);
            }
        }
    }

    function handleSpinWheelClose() {
        showSpinWheel = false;
        onClose(); // Close the entire create project overlay
    }

</script>

<div class="create-project-overlay" onclick={onClose} role="button" tabindex="0" onkeydown={(e) => e.key === 'Escape' && onClose()}>

  {#if promptChosen}
  <h1 style="color: #E6819F; font-size: 3em; margin-bottom: 8px;" transition:fade={{duration: 150}}>YOUR NEW PROJECT!</h1>
  <img src="/projects/sparkle_egg1.png" class="create-project-egg" style="width: 20%;" alt="New project egg" transition:fly={{ y: 40, duration: 300 }} />
  <p class="create-project-text">this is your new {selectedEvent} project.</p>
  <p class="create-project-text">take good care of it!</p>

  <style>
    .create-project-text {
      color: white;
      margin: 0;
    }
  </style>

  {:else}
  <h1 style="color: #E6819F; font-size: 3em; margin-bottom: 8px;" transition:fade={{duration: 150}}>CREATE PROJECT!</h1>

  <div class="create-project-content"  onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="0" onkeydown={(e) => e.key === 'Escape' && onClose()}>

    <!-- {#await promise}
      <p>Loading…</p>
    {:then data}
      {#if data && data.events && data.events.length} -->

  <div class="events-row" style:--event-count=2>

    {#each Object.entries(eventNames) as [key, event], index}
    <div
      class="event-card"
      class:selected={selectedEvent === key}
      style:--event-index={index}
      style:--primary-color={event.primaryColor}
      style:--secondary-color={event.secondaryColor}
      onclick={() => selectedEvent = key}
      onkeydown={(e) => e.key === 'Enter' && (selectedEvent = key)}
      role="button"
      tabindex="0"
      transition:fly|global={{ y: 40, duration: 80, delay: index * 80 }}
    >
      <p class="event-name">{event.name}</p>
      <p class="event-info">Min {event.minHours} hours · Earn {event.minStars}-{event.maxStars} <Tooltip text="earn coins by submitting projects. use them to buy items in the shop!">
        <img style="height: 1.2em; width: auto; margin-bottom: -0.1em;" src="/coin.png" />
      </Tooltip></p>
      <img class="event-image" src={event.image} alt={event.name} />
      <p>{event.description}</p>
    </div>
    {/each}


  </div>

  <div style="display: flex; flex-direction: column; align-items: center;" transition:fade={{duration: 150}}>
    {#if errorMessage}
      <p class="error-message">{errorMessage}</p>
    {/if}

    {#if selectedEvent}
      <button
        class="start-button"
        onclick={handleStartProject}
        disabled={isCreating}
      >
        {#if isCreating}
          Creating...
        {:else}
          {eventNames[selectedEvent]?.cta}
        {/if}
      </button>
    {:else}
      <button class="start-button" disabled>PICK ONE...</button>
    {/if}
  </div>

  </div>
  {/if}
  <img src="/prompts/axolotl.png" class="create-project-axolotl" alt="Axolotl mascot" transition:fly={{ y: 40, duration: 150 }} />

</div>

{#if showSpinWheel}
  <div class="spin-wheel-overlay">
    <SpinWheel onClose={handleSpinWheelClose} />
  </div>
{/if}

<style>

  .start-button {
    color: #E6819F;
    background-color: #EDD4D4;
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    font-family: inherit;
    font-weight: 800;
    margin-top: 16px;
    margin-bottom: 16px;
    font-size: 1.2em;
    transition: 0.2s;
    text-align: center;
    cursor: pointer;

  }

  .start-button:disabled {
    opacity: 50%;
  }

  .start-button:hover:not(:disabled) {
    background-color: #E6819F;
    color: #EDD4D4;
  }

  .error-message {
    color: #ff6b6b;
    background-color: #ffe0e0;
    border: 2px solid #ff6b6b;
    border-radius: 4px;
    padding: 8px 16px;
    margin-bottom: 16px;
    font-size: 0.9em;
    text-align: center;
  }

.events-row {
  display: flex;
  flex-direction: row;
  gap: 24px;
  justify-content: center;
  align-items: stretch;
  margin-top: 16px;
  flex-wrap: wrap;
  background-color: none;
}

.event-card {
  background: var(--secondary-color);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: calc(80% / (var(--event-count) + 1));

  border: 4px solid var(--primary-color);
  border-radius: 8px;
  color: var(--primary-color);
  padding: 0;

  font-size: 0.8em;

  padding: 24px;

  transition: transform 0.2s;
  cursor: pointer;
}
.event-card.selected {
  transform: translateY(-15px);
}

.event-card:hover:not(.selected) {
  transform: translateY(-8px);
}

.event-card p {
  margin: 0;
  text-align: center;
}

.event-name {
  font-weight: 800;
  font-size: 1.5em;
  text-align: center;
}



.event-info {
  text-align: center;
}

.event-image {
    width: 100%;
    box-sizing: border-box;
    border: 4px solid var(--primary-color);
    border-radius: 8px;
    margin-top: 16px;
    margin-bottom: 16px;
}



.create-project-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding-bottom: 64px;
}

.create-project-axolotl {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  height: 25vh;
  z-index: 1100;
  pointer-events: none;
}

.create-project-content {
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
}

.spin-wheel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 2000;
  background-color: rgba(0, 0, 0, 0.9);
}

</style>
