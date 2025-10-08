<script>
  let { showPopup, onClose } = $props();
  
  // HackaTime setup steps data
  const setupSteps = [
    {
      step: "what is hackatime?",
      description: "hackatime is a tool by hack club to track your coding activity! milkyway uses hackatime to track the number of hours you spend building your game."
    },
    {
      step: "step one: log into hackatime",
      description: "visit [hackatime.hackclub.com](https://hackatime.hackclub.com) and log in with your email.\n\nif you already have a hackatime account under a different email, you can add the email you use in milkyway under hackatim settings."
    },
    {
      step: "step two: set up hackatime for your coding environment",
      description: "install the wakatime plugin for your preferred game engine or code editor. you can find instructions for your editor [here](https://hackatime.hackclub.com/docs#supported-editors)!"
    }
  ];

  // Function to convert markdown links and newlines to HTML
  function parseMarkdownText(text) {
    return text
      // Convert markdown links to HTML links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Convert double newlines to paragraph breaks
      .replace(/\n\n/g, '</p><p>')
      // Wrap the entire text in a paragraph tag
      .replace(/^(.*)$/, '<p>$1</p>')
      // Clean up any empty paragraphs
      .replace(/<p><\/p>/g, '');
  }
</script>

{#if showPopup}
  <div class="popup-overlay" onclick={onClose}>
    <div class="popup-content hackatime-setup-popup" onclick={(e) => e.stopPropagation()}>
      <h3>let's set up hackatime!</h3>
      <button class="popup-close" onclick={onClose}>×</button>
      
      <div class="setup-steps">
        {#each setupSteps as step, index}
          <div class="setup-step">
            <h4 class="step-header">{step.step}</h4>
            <div class="step-description">
              {@html parseMarkdownText(step.description)}
            </div>
          </div>
        {/each}
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
    z-index: 1000;
  }

  .popup-content {
    background-color: #FBF2BF;
    border: 4px solid #F7C881;
    border-radius: 8px;
    padding: 32px;
    position: relative;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .popup-content h3 {
    margin: 0 0 8px 0;
    color: #2c3e50;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }

  .popup-close {
    position: absolute;
    top: 16px;
    right: 20px;
    background: none;
    border: none;
    font-size: 28px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .popup-close:hover {
    color: #333;
  }

  .hackatime-setup-popup {
    width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    text-align: left;
  }

  .setup-steps {
    margin-top: 24px;
  }

  .setup-step {
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(247, 200, 129, 0.3);
  }

  .setup-step:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  .step-header {
    margin: 0 0 12px 0;
    color: #2c3e50;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.3;
  }

  .step-description {
    margin: 0;
    color: #34495e;
    font-size: 15px;
    line-height: 1.6;
    font-weight: 400;
  }

  /* Global link styling */
  .step-description :global(a) {
    color: #d68910;
    text-decoration: underline;
    transition: color 0.2s;
    font-weight: 500;
  }

  .step-description :global(a:hover) {
    color: #b7950b;
    text-decoration: none;
  }

  .step-description :global(p) {
    margin: 0 0 8px 0;
  }

  .step-description :global(p:last-child) {
    margin-bottom: 0;
  }
</style>
