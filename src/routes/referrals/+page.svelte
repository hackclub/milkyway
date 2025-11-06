<script>
let { data } = $props();

let copyButtonText = $state('copy link');

const checkpoints = [
  {
    referralCount: 3,
    reward: 'free sticker',
    image: '/referrals/rewards/sticker.png'
  },
  {
    referralCount: 5,
    reward: 'furniture pack!',
    image: '/referrals/rewards/furniture.png'
  },
  {
    referralCount: 10,
    reward: 'sticker sheet',
    image: '/referrals/rewards/sticker sheet.png'
  },
  {
    referralCount: 15,
    reward: '10 coins :)',
    image: '/coin.png'
  },
  {
    referralCount: 25,
    reward: 'milkyway pin',
    image: '/referrals/rewards/pin.png'
  },
  {
    referralCount: 35,
    reward: '30 coins :o',
    image: '/coin.png'
  },
  {
    referralCount: 50,
    reward: 'hoodie!',
    image: '/referrals/rewards/hoodie.png'
  }
];

// Calculate the index of the checkpoint the player is between based on referralCount
// Returns:
//   0   if referralCount < checkpoints[0].referralCount
//   1   if between checkpoint 0 and 1
//   2   if between checkpoint 1 and 2
//  etc.
function getPlayerPosition() {
  const rc = data.referralCount ?? 0;
  let index = 0;
  for (let i = 0; i < checkpoints.length; i++) {
    console.log(rc, checkpoints[i].referralCount, i);
    if (rc == checkpoints[i].referralCount) {
      index = i;
      break;
    }
    else if (rc < checkpoints[i].referralCount) {
      index = i - 1 + 0.5;
      break;
    }
    index = i + 0.5;
  }
  return index;
}

const playerPosition = getPlayerPosition();

console.log(playerPosition);



var playerY = 0
var playerRotation = 0

if (playerPosition % 2 == 0) {
  playerY = 25;
} else if (playerPosition % 1 == 0) {
  playerY = 47;
} else {
  playerY = 40;
  if ((playerPosition - 0.5) % 2 == 0) {
    playerRotation = 20;
  } else {
    playerRotation = -20;
  }
}




</script>

<svelte:head>
  <title>Referrals ✦ Milkyway</title>
</svelte:head>

<main>

  <div class="referral-info-box">
    <h3>get rewards for referrals!</h3>
    <div class="referral-link">
      {#if data.user?.username}
        https://milkyway.hackclub.com?from={data.user.username}
      {:else}
        https://milkyway.hackclub.com
      {/if}
    </div>
    <div class="button-group">
      <button class="copy-button" onclick={() => {
        const link = data.user?.username 
          ? `https://milkyway.hackclub.com?from=${encodeURIComponent(data.user.username)}`
          : 'https://milkyway.hackclub.com';
        navigator.clipboard.writeText(link);
        copyButtonText = 'copied!';
        setTimeout(() => {
          copyButtonText = 'copy link';
        }, 2000);
      }}>
        {copyButtonText}
      </button>
      <a href="/poster" class="poster-button">
        view posters
      </a>
    </div>
  </div>

  <div class="way">
    <p><a href="/home" style:color="white" style:margin-left="20px" style:margin-top="20px" style:text-decoration="none" >← back</a></p>

    <div class="mimi-container" style:left="calc({playerPosition} * 69vh + 32vh)" style:top="calc({playerY}vh)" style:transform="rotate({playerRotation}deg)">
      <p>you have {data.referralCount} referrals!</p>
      <img src="/referrals/mimi.png" alt="Mimi character" style:width="15vh" class="mimi"/>

    </div>

    {#each checkpoints as checkpoint, index}
      <div class="checkpoint" style:--index={index}>
        <div class="textbox" style:padding-top="4vh">
          <p>{checkpoint.referralCount} referrals</p>
          <p style:margin-top="-2vh">{checkpoint.reward}</p>
        </div>
        <img src="/referrals/star.png" alt="checkpoint" class="star" style:margin-left="2vh" style:width="20vh"/>
        <img src={checkpoint.image} alt={checkpoint.reward} style:width="18vh"style:margin-top="15h"/>
      </div>
    {/each}

  </div>



</main>

<style>
main {
  background-color: #101628;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  justify-content: center;
  align-items: center;
  overflow-x: scroll;
  overflow-y: hidden;
  position: relative;
}

.referral-info-box {
  position: fixed;
  bottom: 20px;
  left: 20px;
  background-color: var(--yellow);
  border-radius: 12px;
  padding: 16px;
  z-index: 200;
  max-width: 320px;
  font-family: 'Futura LT', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.referral-info-box h3 {
  margin: 0 0 12px 0;
  font-size: 1.1rem;
  color: #101628;
  font-weight: 600;
  text-align: center;
}

.referral-link {
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 12px;
  font-size: 0.85rem;
  color: #333;
  word-break: break-all;
  line-height: 1.4;
}

.button-group {
  display: flex;
  gap: 8px;
}

.copy-button, .poster-button {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-button {
  background-color: #739ACE;
  color: white;
}

.poster-button {
  background-color: #D9869F;
  color: white;
}

.copy-button:hover, .poster-button:hover {
  opacity: 0.9;
}


.mimi-container p {
  color: black;
  text-align: center;
  font-weight: bold;

}
.mimi-container {
  position: absolute;
  top: 50vh;
  z-index: 100;
}

.way {
  position: relative;
  background-image: url("/referrals/way.png");
  background-repeat: repeat-x;
  background-size: contain;
  background-position: -115vh 0;
  height: 100vh;
  width: 500vh;
  box-sizing: border-box;
}


.checkpoint {
  position: absolute;
  left: calc(var(--index) * 69vh + 32vh);
  top: 25vh;
  display: flex;
  flex-flow: column;
  height: 65%;
  justify-content: space-between;
  align-items: center;
}

.checkpoint:nth-child(odd) {
  top: 5vh;

}

.checkpoint .star {
  width: 20vh;
}

.textbox {
  background-image: url("/referrals/talk.png");
  background-size: contain;
  background-repeat: no-repeat;
  width: 20vh;
  height: 20vh;

  padding: 10%;
  text-align: center;
}

</style>


