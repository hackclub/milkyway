<script>

import FloorTile from '$lib/components/FloorTile.svelte';
import CreateProject from '$lib/components/CreateProject.svelte';
import ProjectEgg from '$lib/components/room/ProjectEgg.svelte';

let { data } = $props();

let isCreateOpen = $state(false);
let projectList = $state(data.projects || []);

// Debug: log the projects data
console.log('Projects data from server:', data.projects);
console.log('Project list state:', projectList);

</script>
<main>




<div class="zlayer bottom-buttons">
  <div class="bottom-button">
    <img src="/friends.png" />
    <a href="/friends">friends</a>
  </div>

  <div class="bottom-button">
    <img src="/shop.png" />
    <a href="/shop">shop</a>
  </div>

</div>


<div class="zlayer profile-info">
  <img src="https://assets.hackclub.com/flag-orpheus-left.svg" style="width: 100px; position: absolute; top: 5px; left: 0;"/>

  <div class="profile-box">
    <img src="/pfp_placeholder.png" />

    <div class="profile-text">
      <p class="hourinfo">xx hours · xx projects</p>
      <p class="username">{ data.user.username }</p>
    </div>

  </div>
</div>



<div class="zlayer room">

  <img aria-hidden="true" class="room-bg" src="room_draft.png" />

  <FloorTile></FloorTile>

  {#if !projectList || projectList.length === 0}
    <button class="new-project" onclick={() => { isCreateOpen = !isCreateOpen }}>you don't have any projects yet. create something new?</button>
  {/if}

  {#each projectList as project, index}

    <ProjectEgg eggImg={project.egg} bind:projInfo={projectList[index]} x=100px y=80px></ProjectEgg>


  {/each}
</div>

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

.zlayer {
  position: absolute;
  top: 0;
  left: 0;
}

.room {
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
}


.room-bg {
  position: absolute;
  height: 75%;
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

.profile-box img {
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
  bottom: 0;
  width: 100%;
  top: auto;
  display: flex;
  flex-flow: row;
  justify-content: space-between;
  align-items: flex-end;
  padding: 30px;
}

.bottom-buttons a {
  padding: 20px;

}

.bottom-button {
  display: flex;
  flex-flow: column;
  justify-content: space-evenly;
  align-items: center;
  text-align: center;

  border: 2px solid white;
  aspect-ratio: 1;
  padding: 12px;
  width: auto;
  height: 6em;
  box-sizing: border-box;

  border-radius: 8px;
  background-color: #ffffff25;

  color: white;

  transition: 0.2s;

  cursor: pointer;
  pointer-events: all;
}

.bottom-button img {
  height: 80%;
}

.bottom-button p, .bottom-button a {
  margin: 0;
  padding: 0;
  color: inherit;
  text-decoration: none;
}

.bottom-button:hover {
  background-color: white;
  color: black;
}

</style>
