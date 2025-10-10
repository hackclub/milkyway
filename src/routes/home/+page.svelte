<script>

import Room from '$lib/components/room/Room.svelte';
import ProfileInfo from '$lib/components/ProfileInfo.svelte';
import NavigationButtons from '$lib/components/NavigationButtons.svelte';
import OnboardingOverlay from '$lib/components/OnboardingOverlay.svelte';
import FaqPopup from '$lib/components/FaqPopup.svelte';
import PromptPopup from '$lib/components/PromptPopup.svelte';
import SpinWheel from '$lib/components/prompts/roulette/SpinWheel.svelte';
import CreateProject from '$lib/components/CreateProject.svelte';

let { data } = $props();

// Project and UI state
let projectList = $state(data.projects || []);
let showOnboarding = $state(!data.hasOnboarded);
let showFaqPopup = $state(false);
let showPromptPopup = $state(false);
let currentPromptInfo = $state('');
let currentRouletteResults = $state(null);
let showRouletteSpinWheel = $state(false);
let rouletteSpinProjectId = $state(/** @type {string | null} */ (null));
let rouletteSpinProgress = $state(/** @type {any} */ (null));
let isCreateOpen = $state(false);


// Calculate total hours and project count
let totalHours = $derived(Number(projectList.reduce((/** @type {number} */ sum, /** @type {any} */ project) => sum + (project.totalHours || project.hours || 0), 0)));
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
          const index = projectList.findIndex(/** @param {any} p */ (p) => p.id === data.project.id);
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


</script>

<svelte:head>
  <title>Home ✦ Milkyway</title>
</svelte:head>

<main>


{#if showOnboarding}
  <OnboardingOverlay onClose={() => { showOnboarding = false }} user={data.user}>
  </OnboardingOverlay>
{/if}

<FaqPopup 
  showPopup={showFaqPopup} 
  onClose={() => { showFaqPopup = false }} 
/>

<PromptPopup 
  bind:showPopup={showPromptPopup} 
  promptInfo={currentPromptInfo}
  rouletteResults={currentRouletteResults}
/>



<!-- Profile Info -->
<ProfileInfo 
  user={data.user}
  {totalHours}
  {projectCount}
  coins={data.coins}
  stellarships={data.stellarships}
  paintchips={data.paintchips}
  onLogout={handleLogout}
/>

<!-- Navigation Buttons -->
<NavigationButtons 
  onOpenFaq={() => { showFaqPopup = true; }}
/>

<!-- Your Room -->
<div class="user-room">
  <Room 
    bind:projectList={projectList}
    bind:isCreateOpen={isCreateOpen}
    user={data.user}
    onShowPromptPopup={showPromptPopupHandler}
    onOpenRouletteSpin={openRouletteSpinHandler}
    onDeleteProject={() => {}}
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
  <CreateProject onClose={() => { isCreateOpen = false }} bind:projectList={projectList} />
{/if}

</main>


<style>
main {
  background-image: url("/milkyway bg.png");
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

</style>
