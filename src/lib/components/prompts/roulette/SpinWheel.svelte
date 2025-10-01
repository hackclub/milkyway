<script>
  import { onMount } from 'svelte';
  import LinkButton from '$lib/components/LinkButton.svelte';
  import { choices } from '../../../data/wheel-options.js';

  let { onClose } = $props();

  // Component state
  let currentWheel = $state('camera');
  let wheelOptions = $state(choices.camera);
  let selectedOptions = $state([]);
  let isSpinning = $state(false);
  let showWheel = $state(false);
  let winningOption = $state('');
  let detailTitle = $state('hover on an option to see detailed explanation!');
  let detailDescription = $state('');
  let detailImages = $state([]);
  let limit = $state(0);
  let errorMessage = $state('');

  // Initialize selected options
  $effect(() => {
    selectedOptions = Object.keys(wheelOptions);
  });

  // Calculate limit based on current wheel
  $effect(() => {
    const totalCount = Object.keys(wheelOptions).length;
    limit = Math.ceil(0.33 * totalCount);
  });

  // Update wheel options when current wheel changes
  function updateWheelOptions() {
    wheelOptions = choices[currentWheel] || choices.camera;
    selectedOptions = Object.keys(wheelOptions);
  }

  // Navigation between wheels
  const wheelOrder = ['camera', 'gameplay', 'setting'];
  
  function getCurrentIndex() {
    return wheelOrder.indexOf(currentWheel);
  }

  function getWheelTitle() {
    if (currentWheel === 'camera') return 'wheel 1 of 3: camera';
    if (currentWheel === 'gameplay') return 'wheel 2 of 3: gameplay';
    if (currentWheel === 'setting') return 'wheel 3 of 3: setting';
    return `wheel: ${currentWheel}`;
  }

  function getNextButtonText() {
    if (currentWheel === 'camera') return 'ok nice, go next';
    if (currentWheel === 'gameplay') return 'ok nice, last one';
    if (currentWheel === 'setting') return 'see summary';
    return 'continue';
  }

  function getNextWheel() {
    const currentIndex = getCurrentIndex();
    const nextIndex = currentIndex + 1;
    return nextIndex < wheelOrder.length ? wheelOrder[nextIndex] : null;
  }

  // Handle option selection
  function toggleOption(option) {
    if (isSpinning) return;
    
    const isSelected = selectedOptions.includes(option);
    const currentSelected = selectedOptions.filter(opt => opt !== option);
    
    if (isSelected) {
      selectedOptions = currentSelected;
    } else {
      if (currentSelected.length >= Object.keys(wheelOptions).length - limit) {
        errorMessage = `You can disable at most ${limit} options`;
        return;
      }
      selectedOptions = [...currentSelected, option];
    }
    errorMessage = '';
  }

  // Handle option hover
  function updateDetails(option) {
    if (isSpinning) return;
    detailTitle = option;
    detailDescription = wheelOptions[option]?.description || '';
    detailImages = Object.keys(wheelOptions[option]?.examples || {});
  }

  function clearDetails() {
    if (isSpinning) return;
    detailTitle = 'hover on an option to see detailed explanation!';
    detailDescription = '';
    detailImages = [];
  }

  // Spin the wheel
  async function spinWheel() {
    if (isSpinning || selectedOptions.length === 0) return;

    isSpinning = true;
    showWheel = true;
    clearDetails();

    try {
      // For now, use a simple mock implementation
      // TODO: Replace with actual API call when authentication is set up
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      
      // Randomly select from available options
      const availableOptions = selectedOptions;
      const randomIndex = Math.floor(Math.random() * availableOptions.length);
      const result = availableOptions[randomIndex];
      
      winningOption = result;
      
      // Create and display the wheel with selected options (exact copy from original)
      createWheel(selectedOptions, result);
      isSpinning = false;
      
      /* 
      // Uncomment this when API is ready:
      const response = await fetch('/api/roulette/spin-wheel/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          selectedOptions, 
          wheelOption: currentWheel 
        })
      });

      // Check if response is HTML (404 or error page)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned HTML instead of JSON. Check if API endpoint exists.');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Spin failed');
      }

      const data = await response.json();
      if (data.success && data.result) {
        winningOption = data.result;
        showWinnerDetails(data.result);
        isSpinning = false;
      } else {
        throw new Error('Invalid response from server');
      }
      */
    } catch (error) {
      console.error('Spin error:', error);
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      isSpinning = false;
      showWheel = false;
    }
  }

  function showWinnerDetails(winningOption) {
    detailTitle = `your ${currentWheel} option: ${winningOption}`;
    detailDescription = wheelOptions[winningOption]?.description || '';
    detailImages = Object.keys(wheelOptions[winningOption]?.examples || {});
  }

  // Create and animate the wheel (exact copy from original)
  function createWheel(selectedOptions, winningOption) {
    const wheelContainer = document.getElementById('wheel-container');
    if (!wheelContainer) return;

    // Clear any existing wheel but keep the arrow
    const existingWheel = wheelContainer.querySelector('.roulette-wheel');
    if (existingWheel) {
      existingWheel.remove();
    }

    const count = selectedOptions.length;
    const pos_deg = (360 / count) / 2;
    const neg_deg = -(360 / count) / 2;
    const skew_pos = 90 - (360 / count);
    const skew_neg = -(90 - (360 / count));
    const text_angle = -(-2.5 * (360 / count) + 216);

    // Scale the wheel up from the original 250px to a larger diameter
    const baseDiameter = 250;
    const wheelDiameter = 360; // desired wheel size (px)
    const scale = wheelDiameter / baseDiameter;

    // Offset values for text positioning based on number of options
    const offsets = {
      2: { left: 10, bottom: 20 },
      3: { left: 15, bottom: 20 },
      4: { left: 20, bottom: 20 },
      5: { left: 35, bottom: 20 },
      6: { left: 55, bottom: 20 },
      7: { left: 70, bottom: 5 },
      8: { left: 100, bottom: -15 },
      9: { left: 140, bottom: -40 },
      10: { left: 220, bottom: -70 },
      11: { left: 240, bottom: -70 },
      12: { left: 260, bottom: -70 }
    };

    const offset = offsets[count] || { left: 20, bottom: 20 };
    const scaledOffsetLeft = Math.round(offset.left * scale);
    const scaledOffsetBottom = Math.round(offset.bottom * scale);

    // Find the winning index for highlighting and calculate spin angle
    const winningIndex = selectedOptions.indexOf(winningOption);
    const segmentAngle = 360 / count;

    // The wheel starts with an initial rotation of neg_deg
    // Calculate where the center of the winning segment is relative to the initial position
    const winningSegmentCenterAngle = (winningIndex * segmentAngle) + (segmentAngle / 2);

    // Arrow is at 0 degrees (3 o'clock). We want the winning segment center to align there.
    // Since the wheel starts rotated by neg_deg, and segments start from -90 degrees,
    // we need to calculate the total rotation needed
    const targetAngle = 90; // 90 degrees to get from top to right (arrow position)
    const rotationToAlign = targetAngle - winningSegmentCenterAngle;

    // Add multiple full rotations for dramatic effect
    const fullSpins = 360 * 4;
    const finalRotation = neg_deg + fullSpins + rotationToAlign + 120;

    // Create the wheel structure
    const wheel = document.createElement('ul');
    wheel.className = 'roulette-wheel';

    // Apply inline styles directly
    wheel.style.cssText = `
      transform: rotate(${neg_deg}deg);
      min-height: ${wheelDiameter}px;
      width: ${wheelDiameter}px;
      border-radius: 50%;
      padding: 0;
      position: relative;
      border: 4px solid #FF698A;
      overflow: hidden;
      background-color: #000000;
      list-style: none;
      margin: 0 auto;
      transition: transform 3s cubic-bezier(0.25, 0.1, 0.25, 1);
    `;

    // Create wheel segments
    selectedOptions.forEach((option, index) => {
      const li = document.createElement('li');
      const isWinning = index === winningIndex;

      // Apply inline styles for each segment
      // Segments start from the top (12 o'clock) and go clockwise
      const segmentRotation = (index * segmentAngle) - 90; // -90 to start from top instead of right
      li.style.cssText = `
        padding: 0;
        height: ${Math.round(200 * scale)}px;
        width: ${Math.round(200 * scale)}px;
        display: block;
        position: absolute;
        transform-origin: 0 ${Math.round(200 * scale)}px;
        left: ${Math.round(125 * scale)}px;
        top: ${Math.round(-75 * scale)}px;
        border: 1px solid #FF698A;
        transform: rotate(${segmentRotation}deg) skewY(${skew_neg}deg);
        background-color: transparent;
        transition: background-color 0.5s ease;
      `;

      // Add winning class for later highlighting
      if (isWinning) {
        li.classList.add('winning-segment');
      }

      const div = document.createElement('div');
      div.style.cssText = `
        margin: 0px;
        transform: skewY(${skew_pos}deg) rotate(${skew_pos}deg);
        transform-origin: ${Math.round(90 * scale)}px ${Math.round(52 * scale)}px;
        display: flex;
        text-align: left;
        height: 90%;
        border-radius: ${Math.round(250 * scale)}px;
        margin-top: ${Math.round(25 * scale)}px;
        font-weight: bold;
        text-decoration: none;
        color: #FF698A;
        flex-flow: column;
        justify-content: flex-end;
      `;

      const p = document.createElement('p');
      p.style.cssText = `
        transform: rotate(${text_angle}deg);
        font-size: 0.5em;
        margin-left: ${scaledOffsetLeft}px;
        margin-bottom: ${scaledOffsetBottom}px;
        white-space: nowrap;
        margin-top: 0;
        color: #FF698A;
        font-weight: bold;
        transition: color 0.5s ease;
      `;
      p.textContent = option;

      div.appendChild(p);
      li.appendChild(div);
      wheel.appendChild(li);
    });

    wheelContainer.appendChild(wheel);

    // Trigger the spin animation after a short delay
    setTimeout(() => {
      const finalTransform = `rotate(${finalRotation}deg)`;
      wheel.style.transform = finalTransform;

      // Highlight the winning segment after the spin completes
      setTimeout(() => {
        const winningSegment = wheel.querySelector('.winning-segment');
        if (winningSegment) {
          // Winner appearance: pink background, black text
          winningSegment.style.backgroundColor = '#FF698A';
          const winningText = winningSegment.querySelector('p');
          const winningDiv = winningSegment.querySelector('div');
          if (winningText) {
            winningText.style.color = '#000000';
          }
          if (winningDiv) {
            winningDiv.style.color = '#000000';
          }
        }

        // Show winner details
        showWinnerDetails(winningOption);
      }, 3000); // Wait for 3 seconds (duration of spin animation)
    }, 100);
  }

  // Navigate to next wheel or finish
  function handleNext() {
    const nextWheel = getNextWheel();
    if (nextWheel) {
      currentWheel = nextWheel;
      updateWheelOptions();
      showWheel = false;
      isSpinning = false;
      winningOption = '';
      clearDetails();
    } else {
      // All wheels completed, close the overlay
      if (onClose) {
        onClose();
      } else {
        // Fallback to navigation if no onClose prop
        window.location.href = '/spin';
      }
    }
  }

  // Reset for new wheel
  function resetWheel() {
    showWheel = false;
    isSpinning = false;
    winningOption = '';
    clearDetails();
    selectedOptions = Object.keys(wheelOptions);
  }

  // Initialize on mount
  onMount(() => {
    updateWheelOptions();
  });
</script>

<main class:spin={showWheel}>
  <div class="header">
    {#if onClose}
      <button class="back-link" onclick={onClose}>← back to project selection</button>
    {:else}
      <a href="/spin" class="back-link">← back to dashboard</a>
    {/if}
    <h1>{getWheelTitle()}</h1>
  </div>

  <div class="content">
    <div class="left-panel">
      {#if !showWheel}
        <div class="checkboxes">
          <p>before spinning, remove options that you aren't interested in!</p>
          <p>you can disable at most {limit} options</p>
          {#if errorMessage}
            <p class="error">{errorMessage}</p>
          {/if}

          {#each Object.entries(wheelOptions) as [option, value]}
            <div 
              class="hover-option" 
              data-option={option}
              role="button"
              tabindex="0"
              onmouseenter={() => updateDetails(option)}
              onmouseleave={() => clearDetails()}
            >
              <input 
                type="checkbox" 
                id={option} 
                name="wheelOptions" 
                value={option} 
                checked={selectedOptions.includes(option)}
                onchange={() => toggleOption(option)}
              />
              <label for={option}>{option}</label>
            </div>
          {/each}
        </div>
      {/if}

      <div class="wheel" class:hidden={!showWheel}>
        <div id="wheel-container">
          <div id="wheel-arrow"></div>
        </div>
      </div>
    </div>

    <div class="right-panel">
      <div class="detail-box">
        <p class="detail-title">{detailTitle}</p>
        <p class="detail-description">{detailDescription}</p>
        <div class="detail-images">
          {#each detailImages as image, i}
            <img 
              class="detail-img" 
              src={wheelOptions[detailTitle]?.examples[image] || ''} 
              alt="example {i + 1}"
            />
          {/each}
        </div>
      </div>
    </div>
  </div>

  <div class="controls">
    {#if !showWheel}
      <button 
        class="spin-button" 
        onclick={spinWheel}
        disabled={isSpinning || selectedOptions.length === 0}
      >
        {isSpinning ? 'spinning...' : 'spin!'}
      </button>
    {:else if !isSpinning}
      <button class="next-button" onclick={handleNext}>
        {getNextButtonText()}
      </button>
    {/if}
  </div>
</main>

<style>
  main {
    display: flex;
    flex-flow: column;
    justify-content: center;
    height: 100vh;
    padding: 40px;
    background-color: #000;
    color: #FF698A;
  }

  .header {
    margin-bottom: 20px;
  }

  .back-link {
    color: #FF698A;
    text-decoration: none;
    margin-bottom: 10px;
    display: inline-block;
    background: none;
    border: none;
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
    padding: 0;
  }

  .back-link:hover {
    text-decoration: underline;
  }

  h1 {
    margin: 0;
    font-size: 2em;
  }

  .content {
    display: flex;
    flex: 1;
    gap: 20px;
  }

  .left-panel {
    width: 50%;
  }

  .right-panel {
    width: 50%;
  }

  .checkboxes {
    margin-bottom: 20px;
  }

  .checkboxes p {
    margin: 10px 0;
  }

  .error {
    color: #ff4444;
    font-weight: bold;
  }

  .hover-option {
    position: relative;
    transition: 0.2s;
    left: 0;
    opacity: 0.8;
    margin: 5px 0;
  }

  .hover-option:hover {
    left: 16px;
    opacity: 1;
  }

  .hover-option input {
    margin-right: 10px;
  }

  .wheel {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
    position: relative;
  }

  .wheel.hidden {
    display: none;
  }

  #wheel-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    min-height: 300px;
    position: relative;
  }

  /* Wheel styles are now applied via inline CSS in createWheel function */

  .detail-box {
    padding: 20px;
    border: 2px solid #FF698A;
    border-radius: 10px;
    background-color: rgba(0, 0, 0, 0.8);
    height: 500px;
  }

  .detail-title {
    font-size: 1.2em;
    font-weight: bold;
    margin-bottom: 10px;
  }

  .detail-description {
    margin-bottom: 20px;
    line-height: 1.4;
  }

  .detail-images {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .detail-img {
    height: 150px;
    width: auto;
    max-width: 100%;
    object-fit: contain;
    display: inline-block;
    margin: 4px;
  }

  .controls {
    display: flex;
    justify-content: center;
    margin-top: 20px;
  }

  .spin-button, .next-button {
    background-color: #FF698A;
    color: #000;
    border: none;
    padding: 15px 30px;
    border-radius: 8px;
    font-size: 1.1em;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .spin-button:hover, .next-button:hover {
    background-color: #ff5a7a;
  }

  .spin-button:disabled {
    background-color: #666;
    cursor: not-allowed;
  }

  main.spin .checkboxes {
    display: none;
  }

  main.spin .wheel {
    display: flex;
  }
</style>