<script>
  import { goto } from '$app/navigation';
  
  let { showPopup, onClose } = $props();
  
  // Intro sequence state
  let introStage = $state('secret'); // 'secret', 'listen'
  
  function handleClose() {
    introStage = 'secret';
    onClose();
  }
  
  function handleListen() {
    introStage = 'listen';
  }
  
  function handleHowToEarn() {
    handleClose();
    goto('/bet');
  }
  
  // Handle escape key
  /**
   * @param {KeyboardEvent} event
   */
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showPopup}
  <div 
    class="popup-overlay intro-overlay" 
    onclick={handleClose}
    onkeydown={(e) => e.key === 'Escape' && handleClose()}
    role="dialog"
    aria-modal="true"
    tabindex="0"
    aria-label="Betting intro"
  >
    {#if introStage === 'secret'}
      <div 
        class="intro-content" 
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="document"
      >
        <p class="intro-text-above">i have a secret for you...</p>
        <button class="intro-button" onclick={handleListen} onkeydown={(e) => e.key === 'Enter' && handleListen()}>
          &gt; listen
        </button>
        <img src="/bet/mimo.png" alt="Mimo" class="intro-mimo-image" />
      </div>
    {:else if introStage === 'listen'}
      <div 
        class="intro-content" 
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="document"
      >
        <p class="intro-text-above">there's an easy way to earn extra coins.</p>
        <button class="intro-button" onclick={handleHowToEarn} onkeydown={(e) => e.key === 'Enter' && handleHowToEarn()}>
          &gt; how do i earn extra coins?
        </button>
        <img src="/bet/mimo.png" alt="Mimo" class="intro-mimo-image" />
      </div>
    {/if}
  </div>
{/if}

<style>
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
    z-index: 100;
  }

  .intro-overlay {
    background-color: rgba(0, 0, 0, 0.8);
  }

  .intro-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 24px;
  }

  .intro-text-above {
    color: white;
    font-size: 20px;
    margin: 0;
  }

  .intro-mimo-image {
    width: 200px;
    height: auto;
  }

  .intro-button {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    padding: 8px 16px;
    text-align: left;
  }

  .intro-button:hover {
    opacity: 0.8;
  }
</style>
