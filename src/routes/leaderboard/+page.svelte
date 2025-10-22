<script>
import { onMount } from 'svelte';

let shopItems = $state(/** @type {any[]} */ ([]));


async function loadShopData() {
  try {
    // Load shop items
    const leaderboardResponse = await fetch('/api/get-users-sorted-by-coins');
    
    if (leaderboardResponse.ok) {
      const leaderboardResult = await leaderboardResponse.json();
      
      console.log(leaderboardResult);
    }

  } catch (error) {
    console.error('Error loading shop data:', error);
  }
}

onMount(loadShopData);
</script>


<svelte:head>
  <title>Leaderboard ✦ Milkyway</title>
</svelte:head>

<main>
    <div class="axolotl-container">
        <img class="axolotl-top" src="/prompts/axolotl.png" alt="axolotl up top"/>
        <a class="back-button" href="/home">← back</a>
        <div class="title-container">
            <h1>leaderboard!</h1>
        </div>
        <div class="main-container">

            <div class="user"></div>
        </div>
    </div>
</main>

<style>

    main {
        background-image: url("/milkyway bg.png");
        background-size: cover;
        background-position: center;
        background-attachment: fixed;
        min-height: 100vh;
        width: 100%;
        box-sizing: border-box;

        position: relative;

        overflow-y: auto;
        overflow-x: hidden;
    }
    .main-container {
        margin-top: 20px;
        width: 80%;
        transition: all 0.2s ease;
        font-family: "Futura", sans-serif;
    }
    .user {
        background-color: #FBF2BF;
        border: 4px solid #F7C881;
        border-radius: 8px;
        padding: 16px;
    }
    .axolotl-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
    .title-container {
        margin: 0;
        border: 4px solid #E6819F;
        background-color: #EED4D4;
        padding: 10px;
        border-radius: 8px;
        width: 80%;
        text-align: center;
    }
    .axolotl-top {
        margin: 0;
        padding: 0;
        display: block;
        height: 20vw;
    }
    .back-button {
        position: absolute;
        left: 11vw;
        top: 18vw;
        color: white;
    }

    .shop-title h1 {
        margin: 0 0 16px 0;
        font-family: "Futura", sans-serif;
        color: #333;
    }
    @media (max-width: 768px) {
        .axolotl-top {
            height: 35vw;
        }

        .back-button {
            left: 5vw;
            top: 30vw;
        }

        .shop-title {
            width: 90%;
            padding: 20px;
        }
    }
</style>