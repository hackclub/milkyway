<script lang="ts">
  import { marked } from 'marked';

  let { showPopup, onClose } = $props();
  
  let expandedFaqItem = $state<number | null>(null);
  
  // Configure marked to enable links
  marked.setOptions({
    breaks: true,
    gfm: true
  });
  
  // Function to toggle FAQ item expansion
  function toggleFaqItem(index: number) {
    expandedFaqItem = expandedFaqItem === index ? null : index;
  }
  
  // FAQ data
  const faqData = [
    {
      question: "How do I start?",
      answer:`
1. Create a project and select a prompt.
2. Begin working on your game! Make sure that you have Hackatime tracking set up for that project.
3. You must also commit to Github every hour. 
4. (We will soon add features for you to track art time — for now, make sure you save a timelapse of your art process!)
5. Submit your project when you're done (coming soon too!)

Need even more help? There will be detailed tutorials and workshops coming soon :)`
    },
    {
      question: "What are the requirements for each project?",
      answer: `Your project must:
1. Be a game that has at least 5 minutes of playtime. 
2. Have either a web export, or a Windows and Mac and Linux export (all 3!).
3. Have open-source code on Github with commits **every hour**.
4. Be less than 30% made with AI.
5. Reflect the hours and work spent on the project accurately — don't commit fraud!`
    },
    {
      question: "Can I use AI to help me make my game?",
      answer: `You are allowed to use some AI in your project, but only **up to 30%** of your project may be AI. Anything over 30% may result in a significant reduction in coins earned.

Don't submit AI slop — your projects may be rejected, or you may even be banned from Milkyway.`
    },
    {
      question: "Can I submit my Milkyway projects to other Hack Club events?",
      answer:"Milkyway is not double-dippable. All the projects that you submit here cannot be submitted to other events — except for Athena Award. You may submit Milkyway projects to Athena Award for hours, but not artefacts."
    },
    {
      question: "What is fraud?",
      answer:`
Fraud is deliberately misrepresenting the work that you have done on your project. This includes (but is not limited to):
- Using bots or placing something on your keyboard to inflate your Hackatime hours
- Submitting projects or code that you did not make
- Submitting projects that you have previously submitted to other events

If you're found to be committing fraud, you will be banned from Milkyway. Depending on the severity, you may also be banned from Hackatime and consequentially all Hack Club events.`
    },
    {
      question: "How many coins do I earn from submitting a project?",
      answer: `You can earn **4-10 coins per code hour** that you work on your project. However, it is very highly dependent on the quality of your project. As long as your projects function well, you can expect to earn 8-10 coins per hour on average.
      
  Once you submit, you will also receive feedback that you can then improve upon to earn more coins.`
    },
    {
      question: "Do art hours count for coins?",
      answer: `No, art hours do not count for coins. You can only earn coins by submitting Hackatime-tracked coding hours — do not use Hackatime to track any asset-creation hours!

Art hours do count for paint chips, however, and you can convert some paint chips into coins :)`
    },
    
    {
      question: "What are stellar ships? How do I get them?",
      answer: "After you ship a project, you can polish it even more and release it to the public to earn stellar ships. Click on the Black Hole at the right of the home page to check out stellar ship requirements and submit a project!"
    },
    {
      question: "What are paint chips? How do I get them?",
      answer: `You can earn 10 paint chips for each art hour logged in a project that you have shipped.

You can also buy coins with paint chips — be careful, though, as the price increases after you buy too many 😵‍💫`
    },

  ];
  
  // Reset expanded item when popup closes
  function handleClose() {
    expandedFaqItem = null;
    onClose();
  }
</script>

{#if showPopup}
  <div class="popup-overlay" onclick={handleClose}>
    <div class="popup-content faq-popup" onclick={(e) => e.stopPropagation()}>
      <h3>Frequently asked questions!</h3>
      <button class="popup-close" onclick={handleClose}>×</button>
      
      <div class="faq-list">
        {#each faqData as item, index}
          <div class="faq-item">
            <button 
              class="faq-question" 
              onclick={() => toggleFaqItem(index)}
            >
              <span>{item.question}</span>
              <span class="faq-arrow" class:expanded={expandedFaqItem === index}>▼</span>
            </button>
            
            {#if expandedFaqItem === index}
              <div class="faq-answer">
                {@html marked(item.answer)}
              </div>
            {/if}
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
    z-index: 100;
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

  .faq-popup {
    width: min(700px, 90vw);
    max-height: 80vh;
    overflow-y: auto;
    text-align: left;
  }

  .faq-list {
    margin-top: 24px;
  }

  .faq-item {
    border-bottom: 1px solid rgba(247, 200, 129, 0.3);
    margin-bottom: 0;
  }

  .faq-item:last-child {
    border-bottom: none;
  }

  .faq-question {
    width: 100%;
    background: none;
    border: none;
    padding: 20px 16px;
    text-align: left;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #2c3e50;
    font-size: 17px;
    font-weight: 600;
    line-height: 1.4;
  }

  .faq-question:hover {
    color: #1a252f;
  }

  .faq-arrow {
    transition: transform 0.2s;
    font-size: 14px;
    color: #7f8c8d;
    margin-left: 12px;
    flex-shrink: 0;
  }

  .faq-arrow.expanded {
    transform: rotate(180deg);
  }

  .faq-answer {
    padding: 0 16px 20px 16px;
    color: #34495e;
    line-height: 1.6;
    font-size: 15px;
  }

  .faq-answer :global(p) {
    margin: 0 0 8px 0;
    font-weight: 400;
  }

  .faq-answer :global(p:last-child) {
    margin-bottom: 0;
  }

  .faq-answer :global(strong) {
    font-weight: 700;
    color: #2c3e50;
  }

  .faq-answer :global(em) {
    font-style: italic;
  }

  .faq-answer :global(ul),
  .faq-answer :global(ol) {
    margin: 8px 0;
    padding-left: 24px;
  }

  .faq-answer :global(li) {
    margin: 4px 0;
  }

  .faq-answer :global(code) {
    background: rgba(0, 0, 0, 0.08);
    padding: 2px 5px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 14px;
  }

  .faq-answer :global(a) {
    color: #3498db;
    text-decoration: underline;
    transition: opacity 0.2s;
  }

  .faq-answer :global(a:hover) {
    opacity: 0.8;
  }

  .faq-answer :global(h1),
  .faq-answer :global(h2),
  .faq-answer :global(h3),
  .faq-answer :global(h4) {
    margin: 12px 0 8px 0;
    font-weight: 700;
    color: #2c3e50;
  }

  .faq-answer :global(h1) { font-size: 1.3em; }
  .faq-answer :global(h2) { font-size: 1.2em; }
  .faq-answer :global(h3) { font-size: 1.1em; }
  .faq-answer :global(h4) { font-size: 1.05em; }

  .faq-answer :global(blockquote) {
    margin: 8px 0;
    padding: 8px 12px;
    border-left: 4px solid #f7c881;
    background: rgba(247, 200, 129, 0.1);
  }
</style>
