<script>
  import { getPromptData } from '$lib/data/prompt-data.js';
  import { choices } from '$lib/data/wheel-options.js';
  import { marked } from 'marked';

  let { showPopup = $bindable(), promptInfo = '', rouletteResults = null } = $props();

  // Configure marked to enable links
  marked.setOptions({
    breaks: true,
    gfm: true
  });

  // Get prompt data based on the prompt info
  let promptData = $derived(getPromptData(promptInfo));
  
  // Render markdown content
  let renderedMarkdown = $derived(promptData?.markdownContent ? marked(promptData.markdownContent) : '');
  
  // Check if this is a roulette project with results
  let isRoulette = $derived(promptInfo?.toLowerCase() === 'roulette' && rouletteResults);

  function closePopup() {
    showPopup = false;
  }

  // Handle escape key
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closePopup();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showPopup}
  <div class="popup-overlay" onclick={closePopup} onkeydown={(e) => e.key === 'Escape' && closePopup()} role="dialog" aria-modal="true" aria-labelledby="prompt-popup-title" tabindex="0">
    <div class="popup-content" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="document" 
         style:--primary-color={promptData?.primaryColor || '#F7C881'} 
         style:--secondary-color={promptData?.secondaryColor || '#FBF2BF'}>
      <button class="popup-close" onclick={closePopup}>×</button>
      
      <div class="popup-header">
        <h3 id="prompt-popup-title">
          {#if promptData}
            {promptData.name}
          {:else}
            Prompt Details
          {/if}
        </h3>
      </div>
      
      <div class="popup-body">
        {#if isRoulette}
          <!-- Special roulette results display -->
          <div class="prompt-image-container">
            <img class="prompt-image" src={promptData.image} alt={promptData.name} />
          </div>
          <div class="prompt-details">
            <p class="prompt-description">{promptData.description}</p>
            <div class="prompt-requirements">
              <div class="requirement-item">
                <span class="requirement-label">Minimum Hours:</span>
                <span class="requirement-value">{promptData.minHours} hours</span>
              </div>
              <div class="requirement-item">
                <span class="requirement-label">Coin Reward:</span>
                <span class="requirement-value">
                  {promptData.minStars}-{promptData.maxStars}
                  <img class="coin-icon" src="/coin.png" alt="coins" />
                </span>
              </div>
            </div>
          </div>
          
          <!-- Show each wheel result with details -->
          <div class="roulette-wheels-details">
            {#if rouletteResults.camera}
              <div class="wheel-detail">
                <h4 class="wheel-title">Camera: {rouletteResults.camera}</h4>
                <p class="wheel-description">{choices.camera[rouletteResults.camera]?.description || ''}</p>
                {#if choices.camera[rouletteResults.camera]?.examples}
                  <div class="wheel-examples">
                    {#each Object.entries(choices.camera[rouletteResults.camera].examples) as [gameName, imageUrl]}
                      <div class="example-item">
                        <img src={imageUrl} alt={gameName} class="example-image" />
                        <p class="example-name">{gameName}</p>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
            
            {#if rouletteResults.gameplay}
              <div class="wheel-detail">
                <h4 class="wheel-title">Gameplay: {rouletteResults.gameplay}</h4>
                <p class="wheel-description">{choices.gameplay[rouletteResults.gameplay]?.description || ''}</p>
                {#if choices.gameplay[rouletteResults.gameplay]?.examples}
                  <div class="wheel-examples">
                    {#each Object.entries(choices.gameplay[rouletteResults.gameplay].examples) as [gameName, imageUrl]}
                      <div class="example-item">
                        <img src={imageUrl} alt={gameName} class="example-image" />
                        <p class="example-name">{gameName}</p>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
            
            {#if rouletteResults.setting}
              <div class="wheel-detail">
                <h4 class="wheel-title">Setting: {rouletteResults.setting}</h4>
                <p class="wheel-description">{choices.setting[rouletteResults.setting]?.description || ''}</p>
                {#if choices.setting[rouletteResults.setting]?.examples}
                  <div class="wheel-examples">
                    {#each Object.entries(choices.setting[rouletteResults.setting].examples) as [gameName, imageUrl]}
                      <div class="example-item">
                        <img src={imageUrl} alt={gameName} class="example-image" />
                        <p class="example-name">{gameName}</p>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
          
          {#if renderedMarkdown}
            <div class="markdown-content" class:rendered={renderedMarkdown}>
              {@html renderedMarkdown}
            </div>
          {/if}
        {:else if promptData}
          <div class="prompt-image-container">
            <img class="prompt-image" src={promptData.image} alt={promptData.name} />
          </div>
          <div class="prompt-details">
            <p class="prompt-description">{promptData.description}</p>
            <div class="prompt-requirements">
              <div class="requirement-item">
                <span class="requirement-label">Minimum Hours:</span>
                <span class="requirement-value">{promptData.minHours} hours</span>
              </div>
              <div class="requirement-item">
                <span class="requirement-label">Coin Reward:</span>
                <span class="requirement-value">
                  {promptData.minStars}-{promptData.maxStars}
                  <img class="coin-icon" src="/coin.png" alt="coins" />
                </span>
              </div>
            </div>
          </div>
          {#if renderedMarkdown}
            <div class="markdown-content" class:rendered={renderedMarkdown}>
              {@html renderedMarkdown}
            </div>
          {/if}
        {:else if promptInfo}
          <div class="prompt-info-content">
            <p>{promptInfo}</p>
          </div>
        {:else}
          <div class="prompt-info-content">
            <p>No prompt information available.</p>
          </div>
        {/if}
      </div>
    </div>
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
    z-index: 2000;
  }

  .popup-content {
    background-color: var(--secondary-color);
    border: 4px solid var(--primary-color);
    border-radius: 8px;
    padding: 30px;
    position: relative;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    color: var(--primary-color);
  }

  .popup-header {
    margin-bottom: 20px;
  }

  .popup-header h3 {
    margin: 0;
    color: var(--primary-color);
    font-size: 1.8em;
    font-weight: bold;
    text-align: center;
  }

  .popup-close {
    position: absolute;
    top: 15px;
    right: 20px;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--primary-color);
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .popup-close:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .popup-body {
    color: var(--primary-color);
  }

  .prompt-image-container {
    text-align: center;
    margin-bottom: 20px;
  }

  .prompt-image {
    width: 100%;
    max-width: 200px;
    height: auto;
    border: 4px solid var(--primary-color);
    border-radius: 8px;
    box-sizing: border-box;
  }

  .prompt-details {
    text-align: center;
  }

  .prompt-description {
    font-size: 1.1em;
    line-height: 1.6;
    margin: 0 0 20px 0;
    color: var(--primary-color);
  }

  .prompt-requirements {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 16px;
  }

  .requirement-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    border: 2px solid var(--primary-color);
  }

  .requirement-label {
    font-weight: bold;
    color: var(--primary-color);
  }

  .requirement-value {
    color: var(--primary-color);
    font-weight: normal;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .coin-icon {
    height: 1em;
    width: auto;
    filter: drop-shadow(-1.5px -1.5px 0 white) drop-shadow(1.5px -1.5px 0 white) drop-shadow(-1.5px 1.5px 0 white) drop-shadow(1.5px 1.5px 0 white) drop-shadow(0 0 3px white);
  }

  .markdown-content {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 2px solid var(--primary-color);
    color: var(--primary-color);
    line-height: 1.6;
  }

  .markdown-content :global(h1) {
    font-size: 1.5em;
    font-weight: bold;
    margin: 0 0 16px 0;
    color: var(--primary-color);
  }

  .markdown-content :global(h2) {
    font-size: 1.2em;
    font-weight: bold;
    margin: 20px 0 12px 0;
    color: var(--primary-color);
  }

  .markdown-content :global(h3) {
    font-size: 1.1em;
    font-weight: bold;
    margin: 16px 0 8px 0;
    color: var(--primary-color);
  }

  .markdown-content :global(p) {
    margin: 0 0 12px 0;
    color: var(--primary-color);
  }

  .markdown-content :global(strong) {
    font-weight: bold;
    color: var(--primary-color);
  }

  .markdown-content :global(em) {
    font-style: italic;
    color: var(--primary-color);
  }

  .markdown-content :global(ul) {
    margin: 0 0 12px 0;
    padding-left: 20px;
  }

  .markdown-content :global(ol) {
    margin: 0 0 12px 0;
    padding-left: 20px;
  }

  .markdown-content :global(li) {
    margin: 4px 0;
    color: var(--primary-color);
  }

  .markdown-content :global(blockquote) {
    margin: 12px 0;
    padding: 8px 12px;
    border-left: 4px solid var(--primary-color);
    background: rgba(0, 0, 0, 0.05);
    color: var(--primary-color);
  }

  .markdown-content :global(code) {
    background: rgba(0, 0, 0, 0.1);
    padding: 2px 4px;
    border-radius: 3px;
    font-family: monospace;
    color: var(--primary-color);
  }

  .markdown-content :global(a) {
    color: var(--primary-color);
    text-decoration: underline;
    font-weight: bold;
    transition: opacity 0.2s;
  }

  .markdown-content :global(a:hover) {
    opacity: 0.8;
  }

  .markdown-content :global(a:visited) {
    color: var(--primary-color);
  }

  .prompt-info-content {
    line-height: 1.6;
    font-size: 1em;
    color: var(--primary-color);
  }

  .prompt-info-content p {
    margin: 0;
  }

  /* Roulette Wheels Details */
  .roulette-wheels-details {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .wheel-detail {
    padding: 16px;
    border: 2px solid var(--primary-color);
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.03);
  }

  .wheel-title {
    margin: 0 0 8px 0;
    color: var(--primary-color);
    font-size: 1.2em;
    font-weight: bold;
    text-transform: capitalize;
  }

  .wheel-description {
    margin: 0 0 12px 0;
    color: var(--primary-color);
    font-size: 0.95em;
    line-height: 1.4;
  }

  .wheel-examples {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
    margin-top: 12px;
  }

  .example-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .example-image {
    width: 100%;
    height: 80px;
    object-fit: cover;
    border-radius: 4px;
    border: 2px solid var(--primary-color);
    margin-bottom: 6px;
  }

  .example-name {
    margin: 0;
    font-size: 0.75em;
    color: var(--primary-color);
    font-weight: 600;
  }
</style>
