<script>
  import { onMount } from 'svelte';
  import { goto, invalidateAll } from '$app/navigation';
  import Tooltip from '$lib/components/Tooltip.svelte';
	import { optional } from 'zod';
  
  // Betting state
  let betAmount = $state(0);
  const minBet = 0;
  let maxBet = $state(50);
  let past7DaysHours = $state(0);
  let isLoadingMaxBet = $state(true);
  
  // Hours options with multipliers
  const hoursOptions = [
    { hours: 5, multiplier: 1.1 },
    { hours: 10, multiplier: 1.22 },
    { hours: 25, multiplier: 1.4 }
  ];
  
  let selectedHoursOption = $state(/** @type {{hours: number, multiplier: number} | null} */ (null));
  
  // Current bet state
  let currentBet = $state(/** @type {any} */ (null));
  let isLoadingBet = $state(true);
  let isPlacingBet = $state(false);
  let isClaimingBet = $state(false);
  let userProjects = $state(/** @type {any[]} */ ([]));
  let selectedProjectForClaim = $state(/** @type {string | null} */ (null));
  let userCoins = $state(0);
  
  // Calculate win/lose amounts based on bet and selected option
  let winAmount = $derived(
    selectedHoursOption !== null && betAmount > 0
      ? Math.round(betAmount * selectedHoursOption.multiplier)
      : 0
  );
  
  async function loadMaxBet() {
    try {
      isLoadingMaxBet = true;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch(`/api/bet/max-bet?timezone=${encodeURIComponent(timezone)}`);
      const data = await response.json();
      if (data.success) {
        maxBet = data.maxBet;
        past7DaysHours = data.past7DaysHours;
        // Update slider max if betAmount exceeds new max
        if (maxBet < 1) {
          betAmount = 0;
        } else if (betAmount > maxBet) {
          betAmount = maxBet;
        }
      }
    } catch (error) {
      console.error('Error loading max bet:', error);
    } finally {
      isLoadingMaxBet = false;
    }
  }
  
  async function loadCurrentBet() {
    try {
      isLoadingBet = true;
      const response = await fetch('/api/bet/current');
      const data = await response.json();
      if (data.success && data.bet) {
        currentBet = data.bet;
        if (data.bet.status === 'won') {
          loadUserProjects();
        }
      } else {
        currentBet = null;
      }
    } catch (error) {
      console.error('Error loading current bet:', error);
    } finally {
      isLoadingBet = false;
    }
  }
  
  async function loadUserProjects() {
    try {
      const response = await fetch('/api/get-user-data');
      const data = await response.json();
      if (data.success && data.projects) {
        // Show all projects (not just non-submitted ones) for bet claiming
        userProjects = data.projects;
      }
      if (data.success && data.user && typeof data.user.coins === 'number') {
        userCoins = data.user.coins;
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }
  
  async function loadUserCoins() {
    try {
      const response = await fetch('/api/get-user-data');
      const data = await response.json();
      if (data.success && data.user && typeof data.user.coins === 'number') {
        userCoins = data.user.coins;
      }
    } catch (error) {
      console.error('Error loading user coins:', error);
    }
  }
  
  /**
   * @param {Event} event
   */
  function handleSliderChange(event) {
    const value = Number(/** @type {HTMLInputElement} */ (event.target).value);
    // Snap to round numbers
    betAmount = Math.round(value);
  }
  
  /**
   * @param {number} index
   */
  function selectHoursOption(index) {
    selectedHoursOption = hoursOptions[index];
  }
  
  async function handleConfirm() {
    if (selectedHoursOption === null || betAmount === 0) return;
    
    // Validate bet amount is an integer
    if (!Number.isInteger(betAmount) || betAmount < 1) {
      alert('Bet amount must be a positive whole number');
      return;
    }
    
    // Check max bet
    if (maxBet < 1) {
      alert('You need at least 0.2 hours in the past 7 days to place a bet');
      return;
    }
    
    if (betAmount > maxBet) {
      alert(`Maximum bet is ${maxBet} coins`);
      return;
    }
    
    isPlacingBet = true;
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch('/api/bet/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          betAmount: Math.round(betAmount), // Ensure integer
          hoursGoal: selectedHoursOption.hours,
          timezone
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Small delay to ensure bet is saved, then redirect with full reload
        setTimeout(() => {
          window.location.href = '/home';
        }, 100);
      } else {
        alert(data.error || 'Failed to place bet');
      }
    } catch (error) {
      console.error('Error placing bet:', error);
      alert('Failed to place bet. Please try again.');
    } finally {
      isPlacingBet = false;
    }
  }
  
  async function handleClaim() {
    if (!currentBet || !selectedProjectForClaim) return;
    
    isClaimingBet = true;
    try {
      const response = await fetch('/api/bet/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          betId: currentBet.id,
          projectId: selectedProjectForClaim
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Invalidate all data to force refresh, then redirect
        await invalidateAll();
        goto('/home');
      } else {
        alert(data.error || 'Failed to claim bet');
      }
    } catch (error) {
      console.error('Error claiming bet:', error);
      alert('Failed to claim bet. Please try again.');
    } finally {
      isClaimingBet = false;
    }
  }
  
  // Calculate slider thumb position for displaying number above it
  let sliderThumbPosition = $derived(
    maxBet > 0 && betAmount > 0 ? ((betAmount / maxBet) * 100) : 0
  );
  
  // Calculate dates for bet period display
  function getBetEndDate() {
    if (!currentBet) return null;
    const endDate = new Date(currentBet.endDate);
    return endDate;
  }
  
  /**
   * @param {Date} date
   */
  function formatDate(date) {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                    'july', 'august', 'september', 'october', 'november', 'december'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }
  
  let betEndDate = $derived(() => {
    const endDate = getBetEndDate();
    return endDate ? formatDate(endDate) : '';
  });
  
  // Format time remaining
  function getTimeRemaining() {
    if (!currentBet || !currentBet.expiryDate) return '';
    const expiry = new Date(currentBet.expiryDate);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // Get hours and minutes for claim time remaining
  function getClaimTimeRemaining() {
    if (!currentBet || !currentBet.expiryDate) return { hours: 0, minutes: 0 };
    const expiry = new Date(currentBet.expiryDate);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return { hours: 0, minutes: 0 };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  }

  // Get egg src for project (similar to blackhole)
  /**
   * @param {string | undefined} egg
   */
  function getEggSrc(egg) {
    if (!egg) return '/projects/sparkle_egg1.png';
    return egg.startsWith('/') ? egg : `/${egg}`;
  }
  
  onMount(() => {
    loadMaxBet();
    loadCurrentBet();
    loadUserCoins();
  });

  // Load projects when bet is won
  $effect(() => {
    if (currentBet && currentBet.status === 'won' && userProjects.length === 0) {
      loadUserProjects();
    }
  });
</script>

<svelte:head>
  <title>Mimo Casino ✦ Milkyway</title>
</svelte:head>

<main class="bet-page">
  <div class="header-container">
    <img src="/bet/mimocasino.png" alt="Mimo Casino" class="casino-header" />
    <a class="back-button" href="/home">← back</a>
  </div>
  
  <div class="bet-container">
    {#if isLoadingBet || isLoadingMaxBet}
      <div class="loading-state">
        <p class="loading-text">loading...</p>
      </div>
    {:else if currentBet && currentBet.status === 'won'}
      <!-- Claim Interface -->
      {@const claimTime = getClaimTimeRemaining()}
      {@const coinsEarned = currentBet.coinsEarned || Math.round(currentBet.betAmount * currentBet.multiplier)}
      <div class="claim-container">
        <div class="claim-header">
          <p class="claim-subtitle-text">you worked {(Number(currentBet.hoursWorked) || 0).toFixed(1)} hours this week and won your bet against mimo — congrats!</p>
          <p class="claim-subtitle">claim your reward of {coinsEarned} coins in the next {claimTime.hours > 0 ? `${claimTime.hours}h ` : ''}{claimTime.minutes}m.</p>
        </div>
        
        <div class="claim-section">
          {#if userProjects.length === 0}
            <p class="no-projects">loading projects...</p>
          {:else}
            <div class="project-row">
              {#each userProjects as project}
                <button
                  type="button"
                  class="project-card{selectedProjectForClaim === project.id ? ' selected' : ''}"
                  onclick={() => (selectedProjectForClaim = project.id)}
                >
                  <img src={getEggSrc(project.egg)} alt={project.name ?? 'project'} />
                  <div class="project-name">
                    &gt; {project.name ?? 'unnamed project'}
                  </div>
                </button>
              {/each}
            </div>
            
            <p class="claim-explanation">claimed coins will be rewarded when you next ship the project</p>
            
            <button
              class="claim-button"
              class:enabled={selectedProjectForClaim !== null}
              onclick={handleClaim}
              disabled={selectedProjectForClaim === null || isClaimingBet}
            >
              {isClaimingBet ? 'claiming...' : `claim ${coinsEarned} coins!`}
            </button>
          {/if}
        </div>
      </div>
    {:else if currentBet}
      <!-- Show current bet status -->
      <div class="bet-section">
        <div class="current-bet-status">
          <p><strong>Bet:</strong> {currentBet.betAmount} coins</p>
          <p><strong>Goal:</strong> {currentBet.hoursGoal} hours in 7 days</p>
          <p><strong>Hours worked:</strong> {currentBet.hoursWorked?.toFixed(1) || 0} / {currentBet.hoursGoal}</p>
          <p><strong>Status:</strong> {currentBet.status}</p>
          {#if currentBet.status === 'active'}
            <p>Bet ends: {betEndDate}</p>
            <p class="explanation">Work on your projects to earn hours! Both code hours (Hackatime) and art hours count.</p>
          {/if}
          {#if currentBet.status === 'won'}
            <p class="claim-prompt">Your bet is ready to claim! You have 24 hours.</p>
            <button class="claim-now-button" onclick={() => { loadUserProjects(); }}>
              claim now
            </button>
          {/if}
        </div>
      </div>
    {:else}
      <!-- Place new bet -->
      <div class="bet-section">
        <p class="explanation">
          bet coins on completing hours in the next 7 days. the more hours you work, the more you can bet.
          max bet: 5 × your hours worked in the past 7 days.
        </p>
        
        <!-- Bet amount row -->
        <div class="bet-amount-row">
          <div class="bet-amount-label">how many coins do you want to bet?</div>
          <div class="slider-wrapper">
            <div class="slider-value-above" style="left: {sliderThumbPosition}%">
              {betAmount}
            </div>
            <div class="slider-container">
              <input 
                type="range" 
                min={minBet} 
                max={maxBet} 
                value={betAmount}
                oninput={handleSliderChange}
                class="bet-slider"
                disabled={isLoadingMaxBet}
              />
              <div class="slider-labels">
                <span>0</span>
                <span>{maxBet} (5 × {past7DaysHours.toFixed(1)}h in past 7 days)</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Hours selection row -->
        <div class="hours-row">
          <div class="hours-label">
            <div class="hours-label-bold">how many hours can you do in the next 7 days?</div>
            <div class="hours-label-normal">hours start counting now. both code & art hours count. you have 7 days to complete your goal.</div>
          </div>
          <div class="hours-cards">
            {#each hoursOptions as option, index}
              {@const isSelected = selectedHoursOption !== null && selectedHoursOption.hours === option.hours && selectedHoursOption.multiplier === option.multiplier}
              <button
                class="hours-card"
                class:selected={isSelected}
                onclick={() => selectHoursOption(index)}
                disabled={isLoadingMaxBet || isPlacingBet}
              >
                <div class="card-hours">{option.hours} hours</div>
                <div class="card-multiplier">{option.multiplier}x</div>
                <div class="card-outcome">
                  win: {betAmount > 0 ? Math.round(betAmount * option.multiplier) : 0} coins<br />
                  lose: 0 coins
                </div>
              </button>
            {/each}
          </div>
        </div>
        
        <!-- Bottom row with mimo and confirm button -->
        <div class="bottom-row">
          <img src="/bet/mimo.png" alt="Mimo" class="mimo-image" />
          {#if selectedHoursOption !== null && betAmount > 0}
            <div class="confirm-button-wrapper">
              <Tooltip text="you can't change your bet after placing it!" position="top">
                <button 
                  class="confirm-button enabled"
                  onclick={handleConfirm}
                  disabled={isPlacingBet}
                >
                  {isPlacingBet ? 'placing bet...' : `give mimo ${betAmount} coins!`}
                </button>
              </Tooltip>
              <p class="coins-reminder">you have {userCoins} coins in total... this won't hurt, you'll earn {Math.round(betAmount * (selectedHoursOption.multiplier - 1))} more!</p>
            </div>
          {:else}
            <div class="confirm-button-wrapper">
              <button 
                class="confirm-button"
                disabled
              >
                give mimo coins?
              </button>
              <p class="coins-reminder">you have {userCoins} coins in total... this won't hurt!</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</main>

<style>
  .bet-page {
    min-height: 100vh;
    background: #000;
    padding: 40px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }

  .header-container {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .casino-header {
    max-width: 600px;
    width: 100%;
    height: auto;
  }

  .back-button {
    position: absolute;
    left: 10%;
    top: 50%;
    transform: translateY(-50%);
    color: #FDF0D0;
    text-decoration: none;
    font-size: 16px;
    z-index: 10;
  }

  .back-button:hover {
    color: #fff;
  }

  .bet-container {
    max-width: 800px;
    width: 100%;
  }

  .loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
    padding: 60px 20px;
  }

  .loading-text {
    color: #FDF0D0;
    font-size: 18px;
    text-align: center;
  }

  .bet-section {
    padding: 32px 0;
    margin-bottom: 24px;
  }

  .explanation {
    text-align: center;
    color: #999;
    font-size: 14px;
    margin-bottom: 24px;
    line-height: 1.5;
  }

  .claim-explanation {
    text-align: center;
    color: #999;
    font-size: 14px;
    margin-bottom: 16px;
    font-style: italic;
  }

  .bet-amount-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    gap: 20px;
  }

  .bet-amount-label {
    font-weight: bold;
    text-align: left;
    color: #FDF0D0;
    font-size: 16px;
    flex: 0 0 25%;
    max-width: 25%;
    word-wrap: break-word;
  }

  .slider-wrapper {
    flex: 1;
    position: relative;
  }

  .slider-value-above {
    position: absolute;
    top: -24px;
    transform: translateX(-50%);
    font-weight: bold;
    font-size: 16px;
    color: #FDF0D0;
    pointer-events: none;
  }

  .slider-container {
    position: relative;
  }

  .bet-slider {
    width: 100%;
    height: 4px;
    border-radius: 0;
    background: #333;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
    margin-bottom: 8px;
  }

  .bet-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 30px;
    border-radius: 0;
    background: #FDF0D0;
    border: 2px solid #000;
    cursor: pointer;
  }

  .bet-slider::-moz-range-thumb {
    width: 20px;
    height: 30px;
    border-radius: 0;
    background: #FDF0D0;
    border: 2px solid #000;
    cursor: pointer;
  }

  .slider-labels {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #666;
  }

  .hours-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 24px;
    gap: 20px;
  }

  .hours-label {
    text-align: left;
    color: #FDF0D0;
    font-size: 16px;
    flex: 0 0 25%;
    max-width: 25%;
    word-wrap: break-word;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .hours-label-bold {
    font-weight: bold;
  }

  .hours-label-normal {
    font-weight: normal;
    color: #999;
  }

  .hours-cards {
    display: flex;
    gap: 12px;
    flex: 1;
  }

  .hours-card {
    flex: 1;
    background: #1a1a1a;
    border: 2px solid #333;
    border-radius: 0;
    padding: 16px;
    cursor: pointer;
    text-align: center;
  }

  .hours-card:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .hours-card.selected {
    background: #FDF0D0;
    border-color: #FDF0D0;
  }

  .card-hours {
    font-weight: bold;
    font-size: 16px;
    color: #FDF0D0;
    margin-bottom: 8px;
  }

  .card-multiplier {
    font-weight: bold;
    font-size: 24px;
    color: #FDF0D0;
    margin-bottom: 8px;
  }

  .card-outcome {
    font-weight: normal;
    font-size: 14px;
    color: #999;
    line-height: 1.4;
  }

  .hours-card.selected .card-hours,
  .hours-card.selected .card-multiplier,
  .hours-card.selected .card-outcome {
    color: #000;
  }

  .bottom-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 24px;
  }

  .mimo-image {
    width: 120px;
    height: auto;
  }

  .confirm-button-wrapper {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }

  .confirm-button {
    outline: none;
    border: 2px solid #333;
    border-radius: 0;
    padding: 12px 24px;
    font-size: 16px;
    font-weight: bold;
    background: #1a1a1a;
    color: #666;
    cursor: not-allowed;
  }

  .confirm-button.enabled {
    background: #FDF0D0;
    border-color: #FDF0D0;
    cursor: pointer;
    color: #000;
  }

  .confirm-button.enabled:hover {
    background: #fff;
  }

  .coins-reminder {
    font-size: 12px;
    color: #666;
    text-align: right;
    margin: 0;
  }

  .current-bet-status {
    background: #1a1a1a;
    border: 2px solid #333;
    border-radius: 0;
    padding: 20px;
    margin-bottom: 24px;
  }

  .current-bet-status p {
    margin: 8px 0;
    color: #FDF0D0;
    font-size: 16px;
  }

  .claim-prompt {
    color: #FDF0D0;
    font-weight: bold;
    margin-top: 16px;
  }

  .claim-now-button {
    background: #FDF0D0;
    border: 2px solid #FDF0D0;
    border-radius: 0;
    padding: 12px 24px;
    font-size: 16px;
    font-weight: bold;
    color: #000;
    cursor: pointer;
    margin-top: 12px;
  }

  .claim-now-button:hover {
    background: #fff;
  }

  .bet-status {
    background: #1a1a1a;
    border: 2px solid #333;
    border-radius: 0;
    padding: 20px;
    margin-bottom: 24px;
  }

  .bet-status p {
    margin: 8px 0;
    color: #FDF0D0;
    font-size: 16px;
  }

  .time-remaining {
    color: #FDF0D0;
    font-weight: bold;
  }

  .claim-section {
    margin-top: 24px;
  }

  .claim-section p {
    margin-bottom: 16px;
    color: #FDF0D0;
    font-size: 16px;
  }

  .project-select {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
    max-height: 200px;
    overflow-y: auto;
  }

  .project-option {
    background: #1a1a1a;
    border: 2px solid #333;
    border-radius: 0;
    padding: 12px;
    cursor: pointer;
    text-align: left;
    font-size: 14px;
    color: #FDF0D0;
  }

  .project-option:hover {
    background: #222;
    border-color: #444;
  }

  .project-option.selected {
    background: #FDF0D0;
    border-color: #FDF0D0;
    color: #000;
  }

  .claim-button {
    outline: none;
    border: 2px solid #333;
    border-radius: 0;
    padding: 12px 24px;
    font-size: 16px;
    font-weight: bold;
    background: #1a1a1a;
    color: #666;
    cursor: not-allowed;
    width: 100%;
  }

  .claim-button.enabled {
    background: #FDF0D0;
    border-color: #FDF0D0;
    cursor: pointer;
    color: #000;
  }

  .claim-button.enabled:hover {
    background: #fff;
  }

  /* Claim Interface Styles */
  .claim-container {
    padding: 32px 0;
    max-width: 900px;
    margin: 0 auto;
  }

  .claim-header {
    text-align: center;
    margin-bottom: 40px;
  }

  .claim-subtitle-text {
    text-align: center;
    color: #999;
    font-size: 14px;
    margin-bottom: 24px;
    font-style: italic;
  }

  .claim-subtitle {
    font-size: 20px;
    color: #FDF0D0;
    margin-top: 8px;
  }

  .claim-section {
    margin-top: 32px;
  }

  .project-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    justify-content: center;
    margin-bottom: 1.5rem;
  }

  .project-card {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: center;
    color: inherit;
    transition: transform 0.12s ease, filter 0.12s ease;
  }

  .project-card img {
    display: block;
    width: 140px;
    height: auto;
  }

  .project-card .project-name {
    margin-top: 0.5rem;
    font-size: 0.95rem;
    color: #FDF0D0;
  }

  .project-card.selected {
    transform: translateY(-4px);
    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.7));
  }

  .no-projects {
    text-align: center;
    color: #999;
    font-size: 14px;
    padding: 40px 0;
  }
</style>
