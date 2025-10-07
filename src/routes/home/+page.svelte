<script>

import FloorTile from '$lib/components/FloorTile.svelte';
import CreateProject from '$lib/components/CreateProject.svelte';
import ProjectEgg from '$lib/components/room/ProjectEgg.svelte';
import Tooltip from '$lib/components/Tooltip.svelte';
import ExpandableButton from '$lib/components/ExpandableButton.svelte';
import OnboardingOverlay from '$lib/components/OnboardingOverlay.svelte';
import FaqPopup from '$lib/components/FaqPopup.svelte';

let { data } = $props();

let isCreateOpen = $state(false);
let projectList = $state(data.projects || []);
let showRoomEditPopup = $state(false);
let showOnboarding = $state(!data.hasOnboarded);
let selectedEggId = $state(null);
let showFaqPopup = $state(false);

// Function to handle egg selection
function selectEgg(projectId) {
  selectedEggId = selectedEggId === projectId ? null : projectId;
}

</script>

<svelte:head>
  <title>Home ✦ Milkyway</title>
</svelte:head>

<main>


<div class="zlayer bottom-buttons">
  <a href="/friends" class="bottom-button">
    <img src="/friends.png" />
    <span>friends</span>
  </a>

  <a href="/shop" class="bottom-button">
    <img src="/shop.png" />
    <span>shop</span>
  </a>

</div>

<div class="zlayer faq-button">
  <button class="faq-icon" onclick={() => { showFaqPopup = true }} aria-label="Open FAQ">
    <img src="/mimi_faq.png" alt="FAQ" />
  </button>
</div>



<div class="zlayer profile-info">
  <img src="https://assets.hackclub.com/flag-orpheus-left.svg" style="width: 100px; position: absolute; top: 5px; left: 0;"/>

  <div class="profile-box">
    <img src="/pfp_placeholder.png" />

    <div class="profile-text">
      <p class="hourinfo">xx hours · xx projects</p>
      <p class="username">{ data.user.username }</p>
        <div class="coins-info">

         <p>{ data.coins || 0 }</p>
          <Tooltip text="earn coins by submitting projects. use them to buy items in the shop!">
            <img src="/coin.png" />
          </Tooltip>
          <p> · </p>
          <p>{ data.stellarships || 0 }</p>
          <Tooltip text="earn stellar ships by polishing projects after shipping them. use them for special items in the shop!">
            <img src="/stellarship.png" />
          </Tooltip>
        </div>
    </div>

  </div>
</div>



<div class="zlayer room" onclick={() => selectedEggId = null}>

  <img aria-hidden="true" class="room-bg" src="room_draft.png" />

  <FloorTile></FloorTile>

  {#if !projectList || projectList.length === 0}
    <button class="new-project" onclick={(e) => { e.stopPropagation(); isCreateOpen = !isCreateOpen }}>you don't have any projects yet. create something new?</button>
  {/if}

  {#each projectList as project, index}

    <ProjectEgg 
      eggImg={project.egg} 
      bind:projInfo={projectList[index]} 
      x={project.x} 
      y={project.y}
      selected={selectedEggId === project.id}
      onSelect={() => selectEgg(project.id)}
    ></ProjectEgg>


  {/each}

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
      onClick={() => { showRoomEditPopup = true }} 
    />
  </div>

</div>

{#if isCreateOpen}
  <CreateProject onClose={() => { isCreateOpen = false }} bind:projectList={projectList} />
{/if}

{#if showRoomEditPopup}
  <div class="popup-overlay" onclick={() => { showRoomEditPopup = false }}>
    <div class="popup-content" onclick={(e) => e.stopPropagation()}>
      <h3>room editing coming soon!</h3>
      <button class="popup-close" onclick={() => { showRoomEditPopup = false }}>×</button>
    </div>
  </div>
{/if}

{#if showOnboarding}
  <OnboardingOverlay onClose={() => { showOnboarding = false }} user={data.user}>
    <!-- Add your onboarding content here -->
  </OnboardingOverlay>
{/if}

<FaqPopup 
  showPopup={showFaqPopup} 
  onClose={() => { showFaqPopup = false }} 
/>

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

.zlayer {
  position: absolute;
  top: 0;
  left: 0;
}

.profile-info {
  z-index: 5;
}

.coins-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.coins-info img {
  height: 1em;
  filter: drop-shadow(-1.5px -1.5px 0 white) drop-shadow(1.5px -1.5px 0 white) drop-shadow(-1.5px 1.5px 0 white) drop-shadow(1.5px 1.5px 0 white) drop-shadow(0 0 3px white);
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

.profile-info {
  position: relative;

}

.profile-box {
  position: absolute;;
  background-color: #FBF2BF;
  border: 4px solid #F7C881;
  padding: 8px;
  border-radius: 8px;

  display: flex;
  box-sizing: border-box;

  height: 6em;
  width: auto;

  top: 50px;
  left: 30px;
}

.profile-box > img {
  height: 100%;
  border-radius: 2px;

}



.profile-text {
  padding: 0 12px;

  display: flex;
  flex-flow: column;
  justify-content: center;
}



.profile-text p {
  margin: 0;
}


p.hourinfo {
  opacity: 50%;
  font-size: 0.8em;
}

p.username {
  font-size: 1.2em;
}



.bottom-buttons {
  z-index: 10;
  bottom: 0;
  width: 100%;
  top: auto;
  display: flex;
  flex-flow: row;
  justify-content: space-between;
  align-items: flex-end;
  padding: 30px;
  pointer-events: none;
}

.bottom-buttons a {
  padding: 20px;

}

.bottom-button {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 4px;

  border: 2px solid white;
  aspect-ratio: 1;
  padding: 12px;
  width: auto;
  height: 6em;
  box-sizing: border-box;

  border-radius: 8px;
  background-color: #ffffff25;

  color: white;
  text-decoration: none;

  transition: 0.2s;

  cursor: pointer;
  pointer-events: all;
}

.bottom-button img {
  height: 80%;
}

.bottom-button span {
  margin: 0;
  padding: 0;
  color: inherit;
}


.bottom-button:hover {
  background-color: white;
  color: black;
}

.fab-container {
  position: absolute;
  bottom: 22vw;
  left: 24vw;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.popup-content {
  background-color: #FBF2BF;
  border: 4px solid #F7C881;
  border-radius: 8px;
  padding: 30px;
  position: relative;
  max-width: 300px;
  text-align: center;
}

.popup-content h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.popup-close {
  position: absolute;
  top: 10px;
  right: 15px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #333;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.faq-button {
  z-index: 10;
  bottom: 0;
  left: 200px;
  top: auto;
}

.faq-icon {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  display: block;
  line-height: 0;
  position: relative;
}

.faq-icon img {
  width: auto;
  height: 100px;
  display: block;
}

.faq-icon:hover img {
  opacity: 0;
}

.faq-icon::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 110%;
  background-image: url('/mimi_faq_hover.png');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: bottom;
  opacity: 0;
  pointer-events: none;
}

.faq-icon:hover::after {
  opacity: 1;
}







</style>
