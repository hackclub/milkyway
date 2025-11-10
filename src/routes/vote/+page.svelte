<script>
import { onMount, onDestroy } from 'svelte';

let { data } = $props();

let votingItems = $state(/** @type {any[]} */ ([]));
let userCurrency = $state({ coins: 0, stellarships: 0, paintchips: 0 });
let isLoading = $state(true);
let isVoting = $state(false);
let voteConfirmation = $state(/** @type {{item: any, message: string} | null} */ (null));
let voteAmount = $state(1);
const remainingVotes = $derived(voteConfirmation ? Math.max(0, (voteConfirmation.item?.maxVotes || 0) - (voteConfirmation.item?.votes || 0)) : 0);

// Check if user is logged in
let isLoggedIn = $state(!!data.user);

async function loadVotingData() {
  try {
    // Check if voting is closed (Monday EST)
    const now = new Date();
    const estWeekday = getESTWeekday(now);
    const isClosed = estWeekday === 1; // Monday = 1
    
    // Only load voting items if voting is open
    if (!isClosed) {
      const voteResponse = await fetch('/api/get-shop-vote-items')
      if (voteResponse.ok) {
        const voteResult = await voteResponse.json();
        votingItems = voteResult.shopItems || [];
      }
      console.log('Voting Items:', votingItems);
    } else {
      // Clear voting items when closed
      votingItems = [];
    }

    // Get user currency only if logged in
    if (isLoggedIn && data.user) {
      userCurrency = {
        coins: data.user.coins || 0,
        stellarships: data.user.stellarships || 0,
        paintchips: data.user.paintchips || 0
      };
    }
  } catch (error) {
    console.error('Error loading voting data:', error);
  } finally {
    isLoading = false;
  }
}

function showVoteConfirmation(/** @type {any} */ item) {
  if (!isLoggedIn) {
    // Redirect to login page
    window.location.href = '/';
    return;
  }
  
  if (isVotingClosed) {
    return; // Don't allow voting when closed
  }
  
  voteAmount = 1; // Reset to 1 when opening
  
  voteConfirmation = {
    item,
    message: `how many votes would you like to make for ${item.name} \n`,
  };
}

function hideVoteConfirmation() {
  voteConfirmation = null;
}

async function confirmVote() {
  if (!voteConfirmation || voteAmount > userCurrency.coins) return;
  
  isVoting = true;
  try {
    const response = await fetch('/api/vote-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        itemId: voteConfirmation.item.id,
        voteAmount: voteAmount
      })
    });

    const result = await response.json();
    
    if (result.success) {
      // Update user currency
      userCurrency = result.currency;
      // Show success message (you could add a toast notification here)
      alert(`Successfully voted for ${voteConfirmation.item.name}!`);
      // Reload voting data to update vote counts
      await loadVotingData();
    } else {
      alert(`Vote failed: ${result.error.message}`);
    }
  } catch (error) {
    console.error('Vote error:', error);
    alert('Vote failed. Please try again.');
  } finally {
    isVoting = false;
    hideVoteConfirmation();
  }
}

onMount(loadVotingData);

// Countdown until midnight EST on Sunday (end of Sunday = Monday 00:00 EST)
/** @type {string} */
let countdown = $state('00:00:00');
/** @type {ReturnType<typeof setInterval> | null} */
let _countdownInterval = null;

/**
 * @param {Date} date
 * @returns {{year:number,month:number,day:number,hour:number,minute:number,second:number}}
 */
function getESTPartsFor(date) {
    /** @type {Intl.DateTimeFormat} */
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false
    });
    /** @type {any} */
    const parts = fmt.formatToParts(date).reduce((/** @type {any} */ acc, p) => {
        if (p.type !== 'literal') acc[p.type] = Number(p.value);
        return acc;
    }, {});
    return parts;
}

/** @param {Date} date */
function getESTWeekday(date) {
    const s = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short' }).format(date);
    /** @type {Record<string, number>} */
    const map = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
    return map[s] ?? 0;
}

function computeCountdownString() {
    const now = Date.now();
    const nowDate = new Date(now);

    // Determine EST weekday for "now"
    const estWeekday = getESTWeekday(nowDate);
    // If it's Monday, count to Tuesday (when voting opens). Otherwise count to Monday (when voting closes)
    const targetWeekday = estWeekday === 1 ? 2 : 1; // Tuesday if Monday, otherwise Monday
    let daysUntil = (targetWeekday - estWeekday + 7) % 7;
    if (daysUntil === 0) daysUntil = 7; // next week's target day

    const targetDayInstant = new Date(now + daysUntil * 24 * 60 * 60 * 1000);
    const estParts = getESTPartsFor(targetDayInstant);

    // estParts gives the EST date for the target day; compute timezone offset for that day
    const candidateUtcForSample = Date.UTC(estParts.year, estParts.month - 1, estParts.day, estParts.hour || 0, estParts.minute || 0, estParts.second || 0);
    const tzOffsetMs = candidateUtcForSample - targetDayInstant.getTime();

    // Build midnight EST for that EST date (00:00:00) and convert to UTC epoch
    const targetUtc = Date.UTC(estParts.year, estParts.month - 1, estParts.day, 0, 0, 0) - tzOffsetMs;

    let diffMs = targetUtc - now;
    if (diffMs < 0) diffMs = 0;

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const dd = String(days).padStart(2, '0');
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return `${dd}:${hh}:${mm}:${ss}`;
}

// Check if it's currently Monday EST (voting is closed on Monday)
let isVotingClosed = $state(false);

function updateVotingStatus() {
    const now = new Date();
    const estWeekday = getESTWeekday(now);
    isVotingClosed = estWeekday === 1; // Monday = 1
}

function startCountdown() {
    countdown = computeCountdownString();
    updateVotingStatus();
    _countdownInterval = setInterval(() => {
        countdown = computeCountdownString();
        updateVotingStatus();
    }, 1000); // update every second
}

onMount(() => {
    startCountdown();
});

onDestroy(() => {
    if (_countdownInterval) clearInterval(_countdownInterval);
});
</script>

<svelte:head>
  <title>Vote ✦ Milkyway</title>
</svelte:head>

<main class="vote-page">
    <div class="axolotl-container">
        <img class="axolotl-top" src="/prompts/axolotl.png" alt="axolotl up top"/>
        <a class="back-button" href="/home">← back</a>
        <div class="vote-title">
            <h1>vote for shop items!</h1>
            {#if isLoggedIn}
                <div class="vote-header-controls">
                    <div class="user-currency">
                        <div class="currency-item">
                            <img src="/coin.png" alt="coin" class="currency-icon" />
                            <span>{userCurrency.coins}</span>
                        </div>
                        <div class="currency-item">
                            <img src="/stellarship.png" alt="stellarship" class="currency-icon" />
                            <span>{userCurrency.stellarships}</span>
                        </div>
                        <div class="currency-item">
                            <img src="/paintchip.png" alt="paintchip" class="currency-icon" />
                            <span>{userCurrency.paintchips}</span>
                        </div>
                    </div>
                </div>
            {:else}
                <div class="login-prompt">
                    <p class="login-message">🔒 <a href="/">Log in</a> to vote and view your currency</p>
                </div>
            {/if}
        </div>
    
        <!-- Tab Navigation -->
        <div class="tab-navigation">
            <a href="/shop" class="tab-button">
                prizes
            </a>
            <a href="/vote" class="tab-button active">
                vote
            </a>
        </div>
    
        <div class="vote-items-container">
            {#if isLoading}
                <div class="loading-message">
                    <p>Loading voting items...</p>
                </div>
            {:else}
                <div class="timer-item">
                    <div class="timer">{countdown}</div>
                    {#if isVotingClosed}
                        <p>Time until voting opens</p>
                    {:else}
                        <p>use coins to vote on items that will be added to the shop next week.</p>
                        <p>The top five items with more than 10 votes total will be added. (Ones that lost will be back in the voting next week!)</p>
                    {/if}
                </div>
                {#each votingItems as item}
                    <div class="vote-item" class:completed={item.votes >= item.maxVotes}>
                        <div class="item-image">
                            {#if item.image && Array.isArray(item.image) && item.image.length > 0 && item.image[0] && typeof item.image[0] === 'object' && 'url' in item.image[0]}
                                <img src={item.image[0].url} alt={String(item.name || 'Vote item')} />
                            {:else}
                                <div class="placeholder-image">No Image</div>
                            {/if}
                        </div>
                        <div class="item-info">
                            <div class="item-header">
                                <h3 class="item-name">{item.name}</h3>
                            </div>
                            <p class="item-description">{item.description}</p>
                        <div class="item-pricing">
                            <div class="vote-progress">
                                <div class="vote-progress-bar">
                                    <div
                                        class="vote-progress-fill"
                                        style="width: {item.maxVotes ? Math.min(100, Math.max(0, ((item.votes || 0) / item.maxVotes) * 100)) : 0}%"
                                    ></div>
                                </div>
                                <span class="vote-progress-number">{item.votes || 0} / {item.maxVotes || 0}</span>
                            </div>
                        </div>
                        {#if !isLoggedIn}
                            <button 
                                class="vote-button login-button" 
                                onclick={() => window.location.href = '/'}
                                disabled={isVotingClosed}
                            >
                                log in to vote
                            </button>
                        {:else}
                            <button 
                                class="vote-button vote-action-button" 
                                onclick={() => showVoteConfirmation(item)}
                                disabled={isVotingClosed}
                            >
                                vote!
                            </button>
                        {/if}
                        </div>
                        
                    </div>
                {/each}
            {/if}
        </div>
        
    </div>

    <!-- Vote Confirmation Modal -->
    {#if voteConfirmation}
        <div 
            class="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabindex="-1"
            onclick={hideVoteConfirmation}
            onkeydown={(e) => e.key === 'Escape' && hideVoteConfirmation()}
            style="cursor: pointer;"
        >
            <div 
                class="modal-content" 
                role="document"
                onclick={(e) => e.stopPropagation()}
            >
                <h3 id="modal-title">Confirm Vote</h3>
                <p>{voteConfirmation.message}</p>
                <div class="vote-costs"> 
                    <span class="price vote">
                        <img src="/coin.png" alt="coin" class="currency-icon" />
                        <input 
                            type="number"
                            min="1"
                            value={voteAmount}
                            disabled={Math.max(0, (voteConfirmation.item?.maxVotes || 0) - (voteConfirmation.item?.votes || 0)) === 0}
                            oninput={(e) => {
                                const raw = Number(e.currentTarget.value);
                                const clamped = Math.max(1, isNaN(raw) ? 1 : raw);
                                voteAmount = clamped;
                                e.currentTarget.value = String(clamped);
                            }}
                            required
                        />
                    </span>
                </div>
                
                <div class="modal-buttons">
                    <button 
                        class="modal-button cancel-button" 
                        onclick={hideVoteConfirmation}
                        disabled={isVoting}
                    >
                        cancel
                    </button>
                    <button 
                        class="modal-button confirm-button" 
                        onclick={confirmVote}
                        disabled={ isVoting || userCurrency.coins < voteAmount}
                    >
                        {isVoting ? 'voting...' : 'confirm'}
                    </button>
                </div>
            </div>
        </div>
    {/if}
  
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

    .axolotl-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .axolotl-top {
        margin: 0;
        padding: 0;
        display: block;
        height: 25vw;
    }

    .back-button {
        position: absolute;
        left: 11vw;
        top: 23vw;
        color: white;
    }

    .vote-title {
        margin: 0;
        border: 4px solid #5a9b5e;
        background-color: #a0e7a4;
        padding: 24px;
        border-radius: 8px;
        width: 80%;
        text-align: center;
    }

    .vote-title h1 {
        margin: 0 0 16px 0;
        font-family: "Futura", sans-serif;
        color: #254627;
    }

    .vote-header-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 16px;
        gap: 20px;
    }

    .user-currency {
        display: flex;
        gap: 20px;
    }

    .currency-item {
        display: flex;
        align-items: center;
        gap: 6px;
        background-color: white;
        border: 2px solid #5a9b5e;
        border-radius: 6px;
        padding: 8px 12px;
        font-family: "Futura", sans-serif;
        font-weight: 800;
        color: #333;
    }

    .currency-item .currency-icon {
        width: 16px;
        height: 16px;
        object-fit: contain;
        filter: drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white) drop-shadow(1px 1px 0 white);
    }

    .shop-link-button {
        padding: 8px 16px;
        background-color: #E6819F;
        color: white;
        border: 2px solid #D4708F;
        border-radius: 6px;
        text-decoration: none;
        font-family: "Futura", sans-serif;
        font-weight: 800;
        font-size: 0.9em;
        transition: all 0.2s ease;
        white-space: nowrap;
    }

    .shop-link-button:hover {
        background-color: #D4708F;
        border-color: #C46080;
        transform: translateY(-1px);
    }

    .login-prompt {
        margin-top: 16px;
        text-align: center;
    }

    .login-message {
        background-color: #FFF9E6;
        border: 2px solid #F7C881;
        border-radius: 8px;
        padding: 12px 16px;
        margin: 0;
        font-family: "Futura", sans-serif;
        font-weight: 600;
        color: #8B5A3C;
        font-size: 0.95em;
    }

    .login-message a {
        color: #5a9b5e;
        text-decoration: none;
        font-weight: 800;
    }

    .login-message a:hover {
        text-decoration: underline;
    }

    .tab-navigation {
        display: flex;
        gap: 10px;
        margin: 20px 0;
        justify-content: center;
    }

    .tab-button {
        padding: 10px 20px;
        border: 4px solid #F7C881;
        background-color: #FBF2BF;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 800;
        font-size: 0.9em;
        transition: all 0.2s ease;
        color: #333;
        font-family: "Futura", sans-serif;
        text-decoration: none;
        display: inline-block;
    }

    .tab-button:hover {
        background-color: white;
        transform: translateY(-1px);
    }

    .tab-button.active {
        background-color: #5a9b5e;
        color: white;
        border-color: #5a9b5e;
        transform: translateY(-1px);
    }

    .vote-items-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        width: 90%;
        max-width: 1200px;
        margin: 30px auto 0;
        padding: 20px;
    }

    .vote-item {
        background-color: #FBF2BF;
        border: 4px solid #F7C881;
        border-radius: 8px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        transition: all 0.2s ease;
        font-family: "Futura", sans-serif;
    }

    .vote-item:hover {
        background-color: white;
        transform: translateY(-2px);
    }

    .vote-item.completed {
        background-color: #a0e7a4;
        border-color: #5a9b5e;
    }

    .vote-item.completed:hover {
        background-color: #b8f0bc;
        border-color: #4a8b4e;
    }

    .timer {
        background-color: #5a9b5e;
        border: 4px solid #a0e7a4;
        width: 100%;
        border-radius: 8px;
        padding: 16px;
        text-align: center;
        font-family: "Futura", sans-serif;
        font-weight: 800;
        color: #fff;
        font-size: 1.6em;
    }

    .timer-item {
        border: 4px solid #5a9b5e;
        background-color: #a0e7a4;
        border-radius: 8px;
        padding: 16px;
        display: flex;
        color:#254627;
        font-size: 1.2em;
        flex-direction: column;
        align-items: center;
        text-align: center;
        transition: all 0.2s ease;
        font-family: "Futura", sans-serif;
    }

    .timer-item:hover {
        background-color: white;
        transform: translateY(-2px);
    }
    
    .item-info {
        width: 100%;
    }

    .item-image {
        width: 100%;
        height: 160px;
        margin-bottom: 12px;
        border-radius: 6px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #ffffffaa;
        border: 2px solid white;
    }

    .item-image img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        filter: drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white) drop-shadow(1px 1px 0 white);
    }

    .placeholder-image {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #ffffffaa;
        color: #666;
        font-style: italic;
        font-size: 0.9em;
    }

    .item-header {
        margin-bottom: 8px;
    }

    .item-name {
        margin: 0 0 4px 0;
        color: #333;
        font-size: 1.1em;
        font-weight: 800;
        font-family: "Futura", sans-serif;
        line-height: 1.2;
    }

    .item-description {
        margin: 0 0 12px 0;
        color: #666;
        line-height: 1.3;
        flex-grow: 1;
        font-size: 0.9em;
        width: 100%;
    }

    .item-pricing {
        display: flex;
        gap: 8px;
        justify-content: center;
        flex-wrap: wrap;
        align-items: center;
        width: 100%;
    }

    .vote-costs{
        align-self: center;
        width: 100%;
        display: flex;
        justify-content: center;
        padding-bottom: 10px;
    }

    .vote-progress {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 6px;
        align-items: center;
    }

    .vote-progress-bar {
        width: 90%;
        height: 20px;
        background-color: #ffffffaa;
        border: 2px solid #254627;
        border-radius: 999px;
        overflow: hidden;
    }

    .vote-progress-fill {
        height: 100%;
        background-color: #5a9b5e;
        border-right: 2px solid #3f6d43;
        width: 0%;
        transition: width 200ms ease;
    }

    .vote-progress-number {
        font-family: "Futura", sans-serif;
        font-weight: 800;
        font-size: 0.85em;
        color: #254627;
        background-color: #a0e7a4;
        border: 2px solid #5a9b5e;
        border-radius: 6px;
        padding: 2px 8px;
    }

    .price {
        padding: 6px 10px;
        border-radius: 6px;
        font-weight: 800;
        font-size: 0.85em;
        display: flex;
        align-items: center;
        gap: 4px;
        border: 2px solid white;
        font-family: "Futura", sans-serif;
    }

    .currency-icon {
        width: 14px;
        height: 14px;
        object-fit: contain;
        filter: drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white) drop-shadow(1px 1px 0 white);
    }

    .price.vote {
        background-color: #F7C881;
        color: #8B4513;
        border-color: #8B4513;
        width: fit-content;
        align-self: center;
    }

    .vote-button {
        margin-top: 12px;
        padding: 8px 16px;
        border-radius: 8px;
        font-family: "Futura", sans-serif;
        font-weight: 800;
        font-size: 0.8em;
        width: 100%;
        transition: all 0.2s ease;
        cursor: pointer;
    }

    .vote-action-button {
        border: 4px solid #5a9b5e;
        background-color: #a0e7a4;
        color: #254627;
    }

    .vote-action-button:hover {
        background-color: white;
        transform: translateY(-1px);
    }

    .login-button {
        border: 4px solid #F7C881;
        background-color: #FFF9E6;
        color: #8B5A3C;
    }

    .login-button:hover {
        background-color: #F7C881;
        color: white;
        transform: translateY(-1px);
    }

    .loading-message {
        grid-column: 1 / -1;
        text-align: center;
        padding: 50px;
        background-color: #ffffffaa;
        border: 4px solid white;
        border-radius: 8px;
        color: #666;
        font-family: "Futura", sans-serif;
        font-size: 1.1em;
        font-weight: 600;
    }

    .loading-message p {
        margin: 0;
        animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
        0%, 100% {
            opacity: 0.6;
        }
        50% {
            opacity: 1;
        }
    }

    /* Modal Styles */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal-content {
        background-color: #FBF2BF;
        border: 4px solid #F7C881;
        border-radius: 8px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        font-family: "Futura", sans-serif;
    }

    .modal-content h3 {
        margin: 0 0 16px 0;
        color: #333;
        font-size: 1.2em;
        font-weight: 800;
    }

    .modal-content p {
        margin: 0 0 20px 0;
        color: #666;
        line-height: 1.4;
    }

    .modal-buttons {
        display: flex;
        gap: 12px;
        justify-content: center;
    }

    .modal-button {
        padding: 10px 20px;
        border-radius: 8px;
        font-family: "Futura", sans-serif;
        font-weight: 800;
        font-size: 0.9em;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 4px solid;
        min-width: 80px;
    }

    .cancel-button {
        background-color: #f0f0f0;
        border-color: #ccc;
        color: #666;
    }

    .cancel-button:hover:not(:disabled) {
        background-color: white;
        transform: translateY(-1px);
    }

    .confirm-button {
        background-color: #5a9b5e;
        border-color: #5a9b5e;
        color: white;
    }

    .confirm-button:hover:not(:disabled) {
        background-color: #4a8b4e;
        border-color: #4a8b4e;
        transform: translateY(-1px);
    }

    .modal-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .axolotl-top {
            height: 35vw;
        }

        .back-button {
            left: 5vw;
            top: 30vw;
        }

        .vote-title {
            width: 90%;
            padding: 20px;
        }

        .vote-header-controls {
            flex-direction: column;
            gap: 16px;
            align-items: center;
        }

        .user-currency {
            flex-wrap: wrap;
            justify-content: center;
            gap: 12px;
        }

        .vote-items-container {
            width: 95%;
            grid-template-columns: 1fr;
        }

        .modal-content {
            width: 95%;
            padding: 20px;
        }
    }
</style>

