<script>
  import Tooltip from '$lib/components/Tooltip.svelte';
  import FloorTile from '$lib/components/FloorTile.svelte';
  
  // Component props can be added here as needed
  let { visible = true, onClose = () => {}, user = null } = $props();

  var dialogue_num = $state(0);
  var displayedText = $state('');
  var isTyping = $state(false);
  var showNamePopup = $state(false);
  var username = $state('');
  var isCheckingUsername = $state(false);
  var usernameAvailable = $state(null); // null = not checked, true = available, false = taken
  var showBigCoin = $state(false);
  var showBigRoom = $state(false);
  var showStellarShip = $state(false);

  const dialogues = [
    "welcome to milkyway! (click to continue)",
    user?.username ? "i'm mimi — it seems like you've been here before!" : "i'm mimi, a local resident here. what's your name?",
    "milkyway is your little digital home for gamedev projects and challenges.",
    "you can make games to earn COINS, which you can then use to buy items from the shop, like gift cards!",
    "look, this is your room! when you submit art hours in your game, you earn PAINT CHIPS to buy furniture to level-up your room. pretty cool, right?",
    "after you've made a game, you can polish it even more to earn stellar ships, which are useful for buying special items in the shop...",
    "like the ticket to OVERGLADE, our singapore game jam hackathon in december!",
    "the shop is down at the right. go check it out when you have time.",
    "i'll let you look around for now. if you ever need me, i'll be just here at the bottom left — and definitely head to <a href='https://hackclub.slack.com/archives/C09EZSEMB16' target='_blank'>#milkyway on slack</a> for more questions!"
  ];

  function typeWriter(text, speed = 20) {
    displayedText = '';
    isTyping = true;
    let i = 0;
    
    // Show big coin when "earn COINS" dialogue starts
    if (dialogue_num === 3) {
      showBigCoin = true;
    }

    if (dialogue_num === 4) {
        showBigCoin = false;
        showBigRoom = true;
    }

    if (dialogue_num === 5) {
        showBigRoom = false;
        showStellarShip = true;
    }

    if (dialogue_num === 6) {
        showStellarShip = false;
    }


    
    const timer = setInterval(() => {
      if (i < text.length) {
        // Check if we're inside an HTML tag
        if (text.charAt(i) === '<') {
          // Find the end of the tag
          let tagEnd = text.indexOf('>', i);
          if (tagEnd !== -1) {
            // Add the entire tag at once
            displayedText += text.substring(i, tagEnd + 1);
            i = tagEnd + 1;
          } else {
            // If no closing > found, just add the character
            displayedText += text.charAt(i);
            i++;
          }
        } else {
          displayedText += text.charAt(i);
          i++;
        }
      } else {
        clearInterval(timer);
        isTyping = false;
        
        // Show popup when "what's your name?" completes (only if user doesn't have username)
        if (dialogue_num === 1 && !user?.username) {
          showNamePopup = true;
        }
      }
    }, speed);
  }

  async function nextDialogue() {
    if (isTyping) return; // Prevent clicking during typing
    if (showNamePopup) return; // Prevent clicking when username popup is open
    
    dialogue_num++;
    if (dialogue_num < dialogues.length) {
      typeWriter(dialogues[dialogue_num]);
    } else {
      // End of dialogues - mark onboarding as complete and close the overlay
      try {
        await fetch('/api/complete-onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Failed to mark onboarding as complete:', error);
      }
      onClose();
    }
  }

  async function exitOnboarding() {
    // Mark onboarding as complete and close the overlay
    try {
      await fetch('/api/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Failed to mark onboarding as complete:', error);
    }
    onClose();
  }

  async function checkUsername() {
    if (!username.trim()) {
      usernameAvailable = null;
      return;
    }

    isCheckingUsername = true;
    
    try {
      const response = await fetch('/api/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      });
      
      const data = await response.json();
      
      if (data.success) {
        usernameAvailable = data.available;
      } else {
        console.error('Username check failed:', data.error);
        usernameAvailable = false;
      }
    } catch (error) {
      console.error('Username check error:', error);
      usernameAvailable = false;
    } finally {
      isCheckingUsername = false;
    }
  }

  async function submitName() {
    if (username.trim() && usernameAvailable === true) {
      // Update Airtable with the new username
      try {
        await fetch('/api/update-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim() })
        });
      } catch (error) {
        console.error('Failed to update username:', error);
      }
      
      showNamePopup = false;
      dialogue_num++;
      if (dialogue_num < dialogues.length) {
        typeWriter(dialogues[dialogue_num]);
      }
    }
  }

  // Debounced username checking
  let checkTimeout;
  $effect(() => {
    if (username) {
      clearTimeout(checkTimeout);
      checkTimeout = setTimeout(() => {
        checkUsername();
      }, 500); // Wait 500ms after user stops typing
    }
  });

  // Start the first dialogue when component mounts
  $effect(() => {
    if (visible && dialogue_num === 0) {
      typeWriter(dialogues[0]);
    }
  });
</script>

{#if visible}
  <div class="onboarding-overlay">


    
    {#if showBigCoin}
      <img src="/coin.png" alt="big coin" class="big-coin"/>
    {/if}

    {#if showBigRoom}
      <img src="/room_draft.png" alt="big room" class="big-room"/>
      <FloorTile></FloorTile>

    {/if}

    {#if showStellarShip}
      <img src="/stellarship.png" alt="big stellar ship" class="big-stellar-ship"/>
    {/if}

    {#if showNamePopup}
      <div class="name-popup">
        <div class="name-popup-content">
          <h3>choose your milkyway username!</h3>
          <div class="input-container">
            <input 
              type="text" 
              bind:value={username} 
              placeholder="orpheus"
              onkeydown={(e) => e.key === 'Enter' && submitName()}
              autofocus
            />
            <div class="validation-icon">
              {#if isCheckingUsername}
                <Tooltip text="checking availability...">
                  <span class="loading">⟳</span>
                </Tooltip>
              {:else if usernameAvailable === true}
                <Tooltip text="username available">
                  <span class="checkmark">✓</span>
                </Tooltip>
              {:else if usernameAvailable === false}
                <Tooltip text="username is taken - try another one?">
                  <span class="cross">✗</span>
                </Tooltip>
              {/if}
            </div>
          </div>
          <button onclick={submitName} disabled={!username.trim() || usernameAvailable !== true}>
            continue
          </button>
        </div>
      </div>
    {/if}

     <div class="dialogue" class:disabled={showNamePopup} onclick={dialogue_num >= dialogues.length - 1 ? exitOnboarding : nextDialogue}>
         {@html displayedText}
         <span class="cursor">|</span>
     </div>

   <div class="name-box">mimi</div>
   <img src="/mimi.png" alt="mimi the axolotl" class="mimi"/>


  </div>
{/if}

<style>
  .onboarding-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 150;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .mimi {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 20vw;

  }

  .name-box {
    background-color: #E6D2D3;
    position: absolute;
    bottom: 20vh;
    padding: 12px 24px;
    left: 20vw;
    font-weight: bold;
    border: 4px solid #DBA1AC;
    border-radius: 12px;
  }

   .dialogue {
     background-color: #E6D2D3;
     border-radius: 12px;
     border: 4px solid #DBA1AC;
     width: 70vw;
     height: 20vh;
     position: absolute;
     bottom: 24px;
     padding: 32px;
     padding-left: 80px;
     cursor: pointer;
   }

   .dialogue a {
     color: #DBA1AC;
     text-decoration: underline;
     font-weight: bold;
   }

   .dialogue a:hover {
     color: #C88A95;
   }

   .dialogue.disabled {
     cursor: not-allowed;
     opacity: 0.7;
   }

   .cursor {
     animation: blink 1s infinite;
     color: #DBA1AC;
   }

   @keyframes blink {
     0%, 50% { opacity: 1; }
     51%, 100% { opacity: 0; }
   }

   .name-popup {
     position: absolute;
     top: 20px;
     left: 50%;
     transform: translateX(-50%);
     z-index: 10;
   }

   .name-popup-content {
     background-color: #E6D2D3;
     border: 4px solid #DBA1AC;
     border-radius: 12px;
     padding: 18px 24px;
     text-align: center;
     min-width: 300px;
   }

   .name-popup-content h3 {
     margin: 0 0 8px 0;
     color: black;
     font-weight: bold;
     font-size: inherit;
   }

   .input-container {
     position: relative;
     margin-bottom: 8px;
   }

   .name-popup-content input {
     width: 100%;
     padding: 12px 40px 12px 12px;
     border: 2px solid #DBA1AC;
     border-radius: 8px;
     font-size: inherit;
     box-sizing: border-box;
     font-family: inherit;
   }

   .name-popup-content input:focus {
     outline: none;
     border-color: #C88A95;
   }

   .name-popup-content button {
     background-color: #DBA1AC;
     color: white;
     border: none;
     padding: 8px 12px;
     border-radius: 8px;
     font-size: inherit;
     cursor: pointer;
     font-family: inherit;
     transition: background-color 0.2s;
   }

   .name-popup-content button:hover:not(:disabled) {
     background-color: #C88A95;
   }

   .name-popup-content button:disabled {
     background-color: #ccc;
     cursor: not-allowed;
   }

   .validation-icon {
     position: absolute;
     right: 12px;
     top: 50%;
     transform: translateY(-50%);
     font-size: 1.2em;
     z-index: 10;
   }

   .checkmark {
     color: #4CAF50;
     font-weight: bold;
   }

   .cross {
     color: #f44336;
     font-weight: bold;
   }

   .loading {
     color: #DBA1AC;
     animation: spin 1s linear infinite;
   }

   @keyframes spin {
     from { transform: rotate(0deg); }
     to { transform: rotate(360deg); }
   }

   .big-coin {
     position: absolute;
     top: 50%;
     left: 50%;
     transform: translate(-50%, -50%);
     height: 50vw;
     max-height: 400px;
     z-index: 1;
     pointer-events: none;
     animation: coinFloat 3s ease-in-out infinite;
   }

   @keyframes coinFloat {
     0%, 100% { transform: translate(-50%, -50%) scale(1); }
     50% { transform: translate(-50%, -50%) scale(1.05); }
   }

   .big-room {
     position: absolute;
     top: 50%;
     left: 50%;
     transform: translate(-50%, -50%);
     height: 700px;
     z-index: -1;
     pointer-events: none;
   }


   .big-stellar-ship {
     position: absolute;
     top: 50%;
     left: 50%;
     transform: translate(-50%, -50%);
     height: 50vw;
     max-height: 400px;
     z-index: 1;
     pointer-events: none;
     animation: coinFloat 3s ease-in-out infinite;
   }

   @keyframes coinFloat {
     0%, 100% { transform: translate(-50%, -50%) scale(1); }
     50% { transform: translate(-50%, -50%) scale(1.05); }
   }

  
</style>
