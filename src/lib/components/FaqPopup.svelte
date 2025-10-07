<script>
  let { showPopup, onClose } = $props();
  
  let expandedFaqItem = $state(null);
  
  // Function to toggle FAQ item expansion
  function toggleFaqItem(index) {
    expandedFaqItem = expandedFaqItem === index ? null : index;
  }
  
  // FAQ data
  const faqData = [
    {
      question: "What are stellar ships? How do I get them?",
      answer: "After you ship a project, you can polish it even more and release it to the public to earn stellar ships. The stellar ship requirements are a combination of efforts — your project must be publicly accessible, look awesome, and hit a certain public reception requirement! Don't worry, it will not be too difficult. More information will come soon."
    },
    {
      question: "How many coins do I earn from submitting a project?",
      answer: "coming soon"
    }
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
                <p>{item.answer}</p>
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

  .faq-popup {
    width: 500px;
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

  .faq-answer p {
    margin: 0;
    font-weight: 400;
  }
</style>
