<script>

import FloorTile from '$lib/components/FloorTile.svelte'

let { data } = $props();

console.log(data.user)

</script>
<main>

<div class="zlayer room">

  <img aria-hidden="true" class="room-bg" src="room_draft.png" />

  <FloorTile></FloorTile>
</div>

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
<div class="profile-box">
<p>{ data.user.username }</p>
</div>
</div>

</main>


<style>
main {
  background-image: url("/milkyway bg.png");
  background-size: cover;
  background-position: center;
  height: 100%;
  width: 100%;
  padding: 30px;
  box-sizing: border-box;

  position: absolute;
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
  -webkit-user-select: none; /* Safari */
  -moz-user-select: none; /* Firefox */
  -ms-user-select: none; /* IE10+/Edge */
  user-select: none; /* Standard */
}

.room-bg {
  height: 75%;
}

.profile-info {

}

.profile-box {
  position: relative;
  background-color: #FBF2BF;
  border: 4px solid #F7C881;
  padding: 20px;
  border-radius: 8px;
  top: 20px;
  left: 20px;

}


.bottom-buttons {
  bottom: 0;
  width: 100%;
  top: auto;
  display: flex;
  flex-flow: row;
  justify-content: space-between;
  padding: 20px;
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
  height: 8em;
  box-sizing: border-box;

  border-radius: 8px;
  background-color: #ffffff25;

  color: white;

  transition: 0.2s;
}

.bottom-button img {
  height: 75%;
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
