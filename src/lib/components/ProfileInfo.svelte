<script>
import Tooltip from './Tooltip.svelte';

let {
  user,
  totalHours,
  projectCount,
  coins,
  stellarships,
  onLogout
} = $props();

let showLogoutButton = $state(false);

</script>

<div class="zlayer profile-info" 
     role="button"
     tabindex="0"
     onmouseenter={() => showLogoutButton = true} 
     onmouseleave={() => showLogoutButton = false}>
  <img src="https://assets.hackclub.com/flag-orpheus-left.svg" style="width: 100px; position: absolute; top: 5px; left: 0;" alt="Hack Club flag"/>

  <div class="profile-box">
    <img src="/pfp_placeholder.png" alt="Profile" />

    <div class="profile-text">
      <p class="hourinfo">{Number(totalHours).toFixed(2)} hours · {projectCount} projects</p>
      <p class="username">{user.username}</p>
      <div class="coins-info">
        <p>{coins || 0}</p>
        <Tooltip text="earn coins by submitting projects. use them to buy items in the shop!">
          <img src="/coin.png" alt="Coins" />
        </Tooltip>
        <p> · </p>
        <p>{stellarships || 0}</p>
        <Tooltip text="earn stellar ships by polishing projects after shipping them. use them for special items in the shop!">
          <img src="/stellarship.png" alt="Stellar ships" />
        </Tooltip>
      </div>
    </div>

    <button class="logout-button" onclick={onLogout} class:visible={showLogoutButton}>
      log out
    </button>
  </div>
</div>

<style>
.zlayer {
  position: absolute;
  top: 0;
  left: 0;
}

.profile-info {
  z-index: 5;
  position: relative;
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

.profile-box {
  position: absolute;
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
  transition: height 0.2s ease;
}

.profile-info:hover .profile-box {
  height: 8em;
}

.profile-box > img {
  height: calc(6em - 24px);
  border-radius: 2px;
}

.profile-text {
  padding: 0 12px;
  display: flex;
  flex-flow: column;
  justify-content: center;
  height: calc(6em - 24px);
  box-sizing: border-box;
}

.profile-text p {
  margin: 0;
}

.logout-button {
  font-family: inherit;
  font-size: inherit;
  position: absolute;
  bottom: 8px;
  left: 8px;
  right: 8px;
  background-color: #F7C881;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
  z-index: 20;
  text-align: center;
  opacity: 0;
  transition: 0.2s;
}

.logout-button.visible {
  opacity: 1;
}

.logout-button:hover {
  background-color: white;
  color: black;
}

p.hourinfo {
  opacity: 50%;
  font-size: 0.8em;
}

p.username {
  font-size: 1.2em;
}
</style>

