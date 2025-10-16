<script>
  import { slide, fade, scale } from 'svelte/transition';
  import { onMount } from 'svelte';
  import confetti from 'canvas-confetti';

  let { showPopup, onClose, projectInfo, onShip } = $props();
  
  let isShipping = $state(false);
  let shippingError = $state('');
  let currentStep = $state(1); // 1 = questions, 2 = hatching, 3 = confirmation
  let showQuestions = $state(false);
  let showInitialContent = $state(false);
  let clickCount = $state(0);
  let isShaking = $state(false);
  let showConfetti = $state(false);
  let showCreature = $state(false);
  let isFadingOut = $state(false);
  
  // Form data
  let notMadeByYou = $state('');
  let howToPlay = $state('');
  let additionalComments = $state('');

  async function handleShipProject() {
    if (!projectInfo?.id || isShipping) return;
    
    try {
      isShipping = true;
      shippingError = '';
      
      const response = await fetch('/api/ship-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({
          projectId: projectInfo.id,
          shipProject: true // Flag to indicate we're actually shipping the project
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Call the parent's ship handler
        if (onShip) {
          await onShip(projectInfo);
        }
        onClose();
      } else {
        shippingError = result.error?.message || 'Failed to ship project. Please try again.';
      }
    } catch (error) {
      console.error('Error shipping project:', error);
      shippingError = 'Network error. Please check your connection and try again.';
    } finally {
      isShipping = false;
    }
  }

  function handleClose() {
    if (!isShipping && currentStep !== 2) {
      shippingError = '';
      currentStep = 1;
      showQuestions = false;
      showInitialContent = false;
      clickCount = 0;
      isShaking = false;
      showConfetti = false;
      showCreature = false;
      isFadingOut = false;
      notMadeByYou = '';
      howToPlay = '';
      additionalComments = '';
      onClose();
    }
  }

  // Validation for form fields
  let canProceed = $derived(() => {
    const valid = notMadeByYou.trim() !== '' && 
                  howToPlay.trim() !== '' && 
                  additionalComments.trim() !== '';
    console.log('Validation check:', {
      notMadeByYou: notMadeByYou.trim(),
      howToPlay: howToPlay.trim(),
      additionalComments: additionalComments.trim(),
      valid: valid
    });
    return valid;
  });

  async function handleNext() {
    console.log('handleNext called, canProceed:', canProceed());
    if (canProceed()) {
      try {
        console.log('Saving form data to Airtable...');
        // Save form data to Airtable when proceeding to next step
        const response = await fetch('/api/ship-project', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Ensure cookies are sent
          body: JSON.stringify({
            projectId: projectInfo.id,
            notMadeBy: notMadeByYou.trim(),
            howToPlay: howToPlay.trim(),
            addnComments: additionalComments.trim(),
            saveFormOnly: true // Flag to indicate we're just saving form data, not shipping yet
          })
        });

        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response result:', result);
        
        if (result.success) {
          console.log('Form data saved successfully, moving to step 2');
          currentStep = 2;
          clickCount = 0; // Reset click count for hatching
        } else {
          console.error('Failed to save form data:', result.error);
          shippingError = result.error?.message || 'Failed to save form data. Please try again.';
        }
      } catch (error) {
        console.error('Error saving form data:', error);
        shippingError = 'Network error. Please check your connection and try again.';
      }
    } else {
      console.log('Cannot proceed - form validation failed');
    }
  }

  function handleBack() {
    if (currentStep === 3) {
      currentStep = 2; // Go back to hatching from confirmation
    } else if (currentStep === 2) {
      currentStep = 1; // Go back to questions from hatching
    }
  }

  function handleEggClick() {
    clickCount++;
    isShaking = true;
    
    // Stop shaking after animation
    setTimeout(() => {
      isShaking = false;
    }, 200);
    
    // If we've clicked 5 times, hatch the egg
    if (clickCount >= 5) {
      hatchEgg();
    }
  }

  async function hatchEgg() {
    try {
      console.log('Hatching egg for project:', projectInfo.id);
      // Update project to hatched state
      const response = await fetch('/api/ship-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          projectId: projectInfo.id,
          hatchEgg: true // Flag to indicate we're hatching the egg
        })
      });

      const result = await response.json();
      console.log('API response:', result);
      
      if (result.success) {
        console.log('Egg hatched successfully, showing creature...');
        console.log('Project data from API:', result.project);
        
        // Show creature with dramatic entrance
        showCreature = true;
        
        // Trigger confetti after a short delay for dramatic effect
        setTimeout(() => {
          triggerConfetti();
        }, 500);
        
        console.log('showCreature:', showCreature, 'showConfetti:', showConfetti);
        
        // Wait 3 seconds, then fade out for 1 second, then close
        setTimeout(() => {
          console.log('Starting fade out...');
          isFadingOut = true;
        }, 3000);
        
        setTimeout(async () => {
          console.log('Updating project and closing overlay...');
          // Call the parent's ship handler to update the project BEFORE closing
          if (onShip) {
            await onShip(result.project);
          }
          // Small delay to ensure the update is processed
          setTimeout(() => {
            onClose();
          }, 100);
        }, 4000);
      } else {
        shippingError = result.error?.message || 'Failed to hatch egg. Please try again.';
      }
    } catch (error) {
      console.error('Error hatching egg:', error);
      shippingError = 'Network error. Please check your connection and try again.';
    }
  }

  // Trigger initial content fade-in
  function triggerInitialContentFadeIn() {
    console.log('Triggering initial content fade-in...');
    setTimeout(() => {
      console.log('Setting showInitialContent to true');
      showInitialContent = true;
    }, 200); // Short delay to ensure popup is rendered
  }

  // Trigger questions fade-in after initial content loads
  function triggerQuestionsFadeIn() {
    console.log('Triggering questions fade-in...');
    setTimeout(() => {
      console.log('Setting showQuestions to true');
      showQuestions = true;
    }, 1000); // Wait 1 second after initial fade-in
  }

  // Trigger confetti celebration
  function triggerConfetti() {
    // Confetti from bottom left corner
    confetti({
      particleCount: 100,
      angle: 45,
      spread: 60,
      origin: { x: 0, y: 1 },
      zIndex: 999999
    });
    
    // Confetti from bottom right corner
    setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: 135,
        spread: 60,
        origin: { x: 1, y: 1 },
        zIndex: 999999
      });
    }, 200);
    
    // Additional burst from center bottom
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 90,
        spread: 70,
        origin: { x: 0.5, y: 1 },
        zIndex: 999999
      });
    }, 400);
  }

  // Load existing form data when popup opens
  async function loadExistingFormData() {
    if (!projectInfo?.id) return;
    
    try {
      const response = await fetch(`/api/projects?id=${projectInfo.id}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.project) {
          // Load existing form data if available
          notMadeByYou = result.project.notMadeBy || '';
          howToPlay = result.project.howToPlay || '';
          additionalComments = result.project.addnComments || '';
        }
      }
    } catch (error) {
      console.error('Error loading existing form data:', error);
    }
  }

  // Watch for popup opening and trigger animation
  $effect(() => {
    if (showPopup && currentStep === 1) {
      console.log('Popup opened, resetting states to false');
      showQuestions = false;
      showInitialContent = false;
      
      // Load existing form data
      loadExistingFormData();
      
      // Small delay to ensure the popup is fully rendered
      setTimeout(() => {
        triggerInitialContentFadeIn();
        triggerQuestionsFadeIn();
      }, 100);
    }
  });
</script>

{#if showPopup}
  <div class="ship-overlay" onclick={handleClose} onkeydown={(e) => e.key === 'Escape' && handleClose()} role="button" tabindex="0">
    <div class="ship-content" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
      
      {#if currentStep === 1}
        <!-- Step 1: Questions -->
        {#if showInitialContent}
          <div class="project-egg-container" transition:fade={{duration: 600}}>
            <img class="project-egg" src={projectInfo?.egg || "/projects/new_egg1.png"} alt="Project egg" />
          </div>
          
          <h2 class="project-name" transition:fade={{duration: 600, delay: 200}}>{projectInfo?.name || 'Untitled Project'}</h2>
          <p class="hatch-text" transition:fade={{duration: 600, delay: 400}}>let's hatch your egg!</p>
        {/if}
        
        {#if showQuestions}
          <div class="questions-container" transition:fade={{duration: 800}} key="questions-{showQuestions}">
            <div class="question-group">
              <label class="question-label">what parts of your project were not made by you?</label>
              <p class="question-subtitle">(public assets, ai help, help from friends, etc)</p>
              <textarea 
                class="question-input" 
                bind:value={notMadeByYou}
                placeholder="e.g., used free sprites from itch.io, got help with the physics from a friend..."
              ></textarea>
            </div>
            
            <div class="question-group">
              <label class="question-label">how do you play your project?</label>
              <textarea 
                class="question-input" 
                bind:value={howToPlay}
                placeholder="e.g., use WASD to move, click to shoot, collect coins to win..."
              ></textarea>
            </div>
            
            <div class="question-group">
              <label class="question-label">any additional comments?</label>
              <textarea 
                class="question-input" 
                bind:value={additionalComments}
                placeholder="anything else you'd like to share about your project..."
              ></textarea>
            </div>
          </div>
          
          <div class="ship-actions" transition:fade={{duration: 600, delay: 200}} key="actions-{showQuestions}">
            <button class="cancel-btn" onclick={handleClose} disabled={isShipping}>Cancel</button>
            <button class="next-btn" onclick={handleNext} disabled={isShipping || !canProceed()}>
              {canProceed() ? "let's go!" : 'Fill in all fields'}
            </button>
          </div>
        {/if}
        
      {:else if currentStep === 2}
        <!-- Step 2: Egg Hatching -->
        <div class="hatching-container">
          <!-- Debug info -->
          <div style="position: fixed; top: 10px; left: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; z-index: 999999; font-size: 12px;">
            Debug: showCreature={showCreature}, showConfetti={showConfetti}, clickCount={clickCount}
          </div>
          
          {#if showCreature}
            <!-- Show creature with dramatic entrance -->
            <div class="creature-celebration" class:fade-out={isFadingOut} transition:slide={{duration: 800, axis: 'y'}}>
              <div class="creature-container" transition:scale={{duration: 1000, start: 0.3}}>
                <img class="hatched-creature" src="/projects/new_creature1.png" alt="Hatched creature" />
              </div>
              <p class="celebration-text" transition:fade={{duration: 600, delay: 300}}>🎉 your egg has hatched! 🎉</p>
            </div>
          {:else}
            <!-- Egg hatching interface -->
            <div class="hatching-egg-container" class:shaking={isShaking} onclick={handleEggClick}>
              <img class="hatching-egg" src={projectInfo?.egg || "/projects/new_egg1.png"} alt="Project egg" />
            </div>
            
            <p class="hatch-instruction">your egg is ready to hatch... click it!</p>
            
            {#if shippingError}
              <div class="error-message">
                <span>{shippingError}</span>
              </div>
            {/if}
          {/if}
        </div>
        
      {:else if currentStep === 3}
        <!-- Step 3: Confirmation -->
        <h1 class="ship-title">🚀 Ship Your Project</h1>
        
        <div class="project-info">
          <h2 class="project-name">{projectInfo?.name || 'Untitled Project'}</h2>
          <p class="project-description">{projectInfo?.description || 'No description'}</p>
        </div>
        
        <div class="ship-question">
          <p class="question-text">What parts of your game did you make yourself vs. what did you use from others?</p>
        </div>
        
        {#if shippingError}
          <div class="error-message">
            <span>{shippingError}</span>
          </div>
        {/if}
        
        <div class="ship-actions">
          <button class="back-btn" onclick={handleBack} disabled={isShipping}>Back</button>
          <button class="cancel-btn" onclick={handleClose} disabled={isShipping}>Cancel</button>
          <button class="ship-confirm-btn" onclick={handleShipProject} disabled={isShipping}>
            {#if isShipping}
              Shipping...
            {:else}
              Ship Project 💫
            {/if}
          </button>
        </div>
      {/if}
      
    </div>
  </div>
{/if}

<style>
  .ship-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
  }

  .ship-content {
    text-align: center;
    color: white;
    max-width: 700px;
    padding: 40px 20px;
  }

  .ship-title {
    font-size: 3em;
    margin: 0 0 40px 0;
    color: white;
    font-weight: 700;
  }

  .project-egg-container {
    margin-bottom: 30px;
  }

  .project-egg {
    width: 120px;
    height: auto;
    filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.3));
  }

  .project-name {
    font-size: 2.2em;
    margin: 0 0 16px 0;
    color: white;
    font-weight: 600;
  }

  .hatch-text {
    font-size: 1.1em;
    color: #ccc;
    margin: 0 0 40px 0;
    font-style: italic;
  }

  .project-info {
    margin-bottom: 40px;
  }

  .project-description {
    font-size: 1.2em;
    margin: 0;
    color: #ccc;
    line-height: 1.4;
  }

  .questions-container {
    text-align: left;
    margin-bottom: 40px;
  }

  .question-group {
    margin-bottom: 30px;
  }

  .question-label {
    display: block;
    font-size: 1.2em;
    color: white;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .question-subtitle {
    font-size: 0.9em;
    color: #aaa;
    margin: 0 0 12px 0;
    font-style: italic;
  }

  .question-input {
    width: 100%;
    min-height: 80px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    color: white;
    font-family: inherit;
    font-size: 1em;
    line-height: 1.4;
    resize: vertical;
    box-sizing: border-box;
  }

  .question-input::placeholder {
    color: #888;
  }

  .question-input:focus {
    outline: none;
    border-color: #7FA9DB;
    background: rgba(255, 255, 255, 0.15);
  }

  .ship-question {
    margin-bottom: 40px;
  }

  .question-text {
    font-size: 1.3em;
    color: white;
    line-height: 1.4;
    font-weight: 500;
    margin: 0;
  }

  .error-message {
    margin-bottom: 30px;
    color: #ff6b6b;
    font-size: 1.1em;
  }

  .ship-actions {
    display: flex;
    gap: 20px;
    justify-content: center;
  }

  .cancel-btn, .ship-confirm-btn, .next-btn, .back-btn {
    padding: 12px 24px;
    border: 2px solid white;
    border-radius: 8px;
    font-family: inherit;
    font-size: 1.1em;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 120px;
  }

  .cancel-btn, .back-btn {
    background: transparent;
    color: white;
  }

  .cancel-btn:hover:not(:disabled), .back-btn:hover:not(:disabled) {
    background: white;
    color: black;
  }

  .next-btn, .ship-confirm-btn {
    background: #7FA9DB;
    border-color: #7FA9DB;
    color: white;
  }

  .next-btn:hover:not(:disabled), .ship-confirm-btn:hover:not(:disabled) {
    background: #5a8bc4;
    border-color: #5a8bc4;
  }

  .cancel-btn:disabled, .ship-confirm-btn:disabled, .next-btn:disabled, .back-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Hatching step styles */
  .hatching-container {
    text-align: center;
    color: white;
  }

  .hatching-egg-container {
    margin-bottom: 30px;
    cursor: pointer;
    transition: transform 0.1s ease;
  }

  .hatching-egg-container:hover {
    transform: scale(1.05);
  }

  .hatching-egg-container.shaking {
    animation: shake 0.2s ease-in-out;
  }

  .hatching-egg {
    width: 150px;
    height: auto;
    filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.3));
  }

  .hatch-instruction {
    font-size: 1.3em;
    margin-bottom: 20px;
    color: #ccc;
  }

  .click-progress {
    font-size: 1.1em;
    margin-bottom: 20px;
    color: #aaa;
  }

  .hatch-actions {
    display: flex;
    gap: 20px;
    justify-content: center;
    margin-top: 30px;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px) rotate(-2deg); }
    20%, 40%, 60%, 80% { transform: translateX(5px) rotate(2deg); }
  }

  /* Creature celebration styles */
  .creature-celebration {
    text-align: center;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    transition: opacity 1s ease-out;
  }

  .creature-celebration.fade-out {
    opacity: 0;
  }

  .creature-container {
    position: relative;
    margin-bottom: 30px;
  }

  .hatched-creature {
    width: 250px;
    height: auto;
    filter: drop-shadow(0 0 40px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 80px rgba(255, 255, 255, 0.4));
    animation: creature-glow 2s ease-in-out infinite alternate;
  }

  .celebration-text {
    font-size: 2em;
    font-weight: bold;
    color: #fff;
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.4);
    animation: text-pulse 1.5s ease-in-out infinite alternate;
  }

  @keyframes creature-glow {
    0% {
      filter: drop-shadow(0 0 40px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 80px rgba(255, 255, 255, 0.4));
    }
    100% {
      filter: drop-shadow(0 0 60px rgba(255, 255, 255, 1)) drop-shadow(0 0 120px rgba(255, 255, 255, 0.6));
    }
  }

  @keyframes text-pulse {
    0% {
      text-shadow: 0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.4);
    }
    100% {
      text-shadow: 0 0 30px rgba(255, 255, 255, 1), 0 0 60px rgba(255, 255, 255, 0.6);
    }
  }
</style>
