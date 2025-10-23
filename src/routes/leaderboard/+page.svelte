<script>
import { onMount } from 'svelte';

let users = $state(/** @type {any[]} */ ([]));
let isLoading = $state(true);
let currentPage = $state(1);

async function loadLeaderboardData() {
    try {
        // Load top 100 users by coins for current page
        const leaderboardResponse = await fetch(`/api/get-users-sorted-by-coins?limit=100&page=${currentPage}`);
    
        if (leaderboardResponse.ok) {
            const leaderboardResult = await leaderboardResponse.json();
            if (leaderboardResult && leaderboardResult.userList) {
                users = leaderboardResult.userList;
            }
        } else {
            console.error('Failed to load leaderboard:', leaderboardResponse.status);
        }

    } catch (error) {
        console.error('Error loading leaderboard data:', error);
    } finally {
        isLoading = false;
    }
}

onMount(loadLeaderboardData);

function nextPage() {
    currentPage = currentPage + 1;
    isLoading = true;
    loadLeaderboardData();
}

function prevPage() {
    if (currentPage > 1) {
        currentPage = currentPage - 1;
        isLoading = true;
        loadLeaderboardData();
    }
}
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
            <div class="leaderboard-header">
                <div class="col-rank">#</div>
                <div class="col-name">Name</div>
                <div class="col-hours">Hours</div>
                <div class="col-coins">Coins</div>
                <div class="col-ticket">Ticket</div>
            </div>
            {#if isLoading}
                <div class="user">Loading leaderboard...</div>
            {:else if users.length === 0}
                <div class="user">No users found</div>
            {:else}
                <div class="user-container">
                {#each users as u, i}
                    <div class="user">
                        <div class="col-rank">#{i + 1}</div>
                        <div class="col-name">{u.username}</div>
                        <div class="col-hours">{u.hours ?? ''}</div>
                        <div class="col-coins">{u.coins}</div>
                        <div class="col-ticket"></div>
                    </div>
                {/each}
                </div>
                <div class="pagination-controls bottom">
                    <button class="pagination-btn" onclick={prevPage} disabled={currentPage === 1}>← Prev</button>
                    <span class="page-indicator">Page {currentPage}</span>
                    <button class="pagination-btn" onclick={nextPage}>Next →</button>
                </div>
            {/if}
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
        background-color: #bfd7fb;
        border: 4px solid #81a0f7;
        border-radius: 8px;
        padding: 8px;
    }
    .user-container {
    }
    .leaderboard-header {
        display: grid;
        /* rank / name / hours / coins / ticket */
        grid-template-columns: 48px 1fr 80px 120px 100px;
        gap: 12px;
        width: 100%;
        align-items: center;
        margin-bottom: 8px;
        padding: 8px 12px;
        box-sizing: border-box;
    }
    .leaderboard-header .col-name { font-weight: 800; justify-self: start; text-align: left; }
    .leaderboard-header .col-hours { font-weight: 800; justify-self: center; text-align: center; }
    .leaderboard-header .col-coins { font-weight: 800; justify-self: end; text-align: right; }
    .leaderboard-header .col-ticket { font-weight: 800; justify-self: center; text-align: center; }

    .user {
        background-color: #d5e2f6;
        border: 2px solid #81a0f7;
        padding: 8px;
        display: grid;
        grid-template-columns: 48px 1fr 80px 120px 100px;
        gap: 12px;
        font-size: large;
        margin-top: 8px;
        border-radius: 8px;
        align-items: center;
            transition: transform 0.08s ease, box-shadow 0.08s ease;
    }
    .user .col-name { justify-self: start; text-align: left; font-weight:700; }
    .user .col-hours { justify-self: center; text-align: center; }
    .user .col-coins { justify-self: end; text-align: right; font-weight: 800; }
    .user .col-ticket { justify-self: center; text-align: center; }
        .user:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(0,0,0,0.08);
        }
    .pagination-controls { display:flex; gap:12px; align-items:center; justify-content:center; margin: 12px 0; }
    .pagination-btn { padding:8px 12px; border-radius:6px; border:2px solid #5A9BD4; background:#73ACE0; color:white; cursor:pointer; }
    .pagination-btn:disabled { opacity:0.4; cursor:not-allowed; }
    .page-indicator { font-weight:700; }
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