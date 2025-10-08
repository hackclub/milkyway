<script>
  import { getPromptData } from '$lib/data/prompt-data.js';
  import { marked } from 'marked';

  let { showPopup = $bindable(), promptInfo = '' } = $props();

  // Configure marked to enable links
  marked.setOptions({
    breaks: true,
    gfm: true
  });

  // Get prompt data based on the prompt info
  let promptData = $derived(getPromptData(promptInfo));
  
  // Render markdown content
  let renderedMarkdown = $derived(promptData?.markdownContent ? marked(promptData.markdownContent) : '');

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
        {#if promptData}
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
</style>
