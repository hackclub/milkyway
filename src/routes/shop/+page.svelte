<script>
import { onMount } from 'svelte';

let { data } = $props();

let shopItems = $state(/** @type {any[]} */ ([]));
let userCurrency = $state({ coins: 0, stellarships: 0, paintchips: 0 });
let isLoading = $state(true);
let isPurchasing = $state(false);
let purchaseConfirmation = $state(/** @type {{item: any, message: string, canAfford: boolean} | null} */ (null));

// Check if user is logged in
let isLoggedIn = $state(!!data.user);

// Filter items by type
const prizesItems = $derived(shopItems.filter(item => item.type === 'prizes'));
const furnitureItems = $derived(shopItems.filter(item => item.type === 'furniture'));

async function loadShopData() {
  try {
    // Load shop items
    const shopResponse = await fetch('/api/get-shop-items');
    
    if (shopResponse.ok) {
      const shopResult = await shopResponse.json();
      shopItems = shopResult.shopItems || [];
    }

    // Get user currency only if logged in
    if (isLoggedIn && data.user) {
      userCurrency = {
        coins: data.user.coins || 0,
        stellarships: data.user.stellarships || 0,
        paintchips: data.user.paintchips || 0
      };
    }
  } catch (error) {
    console.error('Error loading shop data:', error);
  } finally {
    isLoading = false;
  }
}

function canAfford(/** @type {any} */ item) {
  if (!isLoggedIn) return false; // Can't afford anything if not logged in
  return (userCurrency.coins >= (item.coins_cost || 0)) &&
         (userCurrency.stellarships >= (item.stellarships_cost || 0)) &&
         (userCurrency.paintchips >= (item.paintchips_cost || 0));
}

function isOneTimeItem(/** @type {any} */ item) {
  return Boolean(item.one_time);
}

function showPurchaseConfirmation(/** @type {any} */ item) {
  if (!isLoggedIn) {
    // Redirect to login page
    window.location.href = '/';
    return;
  }
  
  const totalCost = [];
  if (item.coins_cost) totalCost.push(`${item.coins_cost} coins`);
  if (item.stellarships_cost) totalCost.push(`${item.stellarships_cost} stellarships`);
  if (item.paintchips_cost) totalCost.push(`${item.paintchips_cost} paintchips`);
  
  purchaseConfirmation = {
    item,
    message: `Are you sure you want to spend ${totalCost.join(', ')} on ${item.name}?`,
    canAfford: canAfford(item)
  };
}

function hidePurchaseConfirmation() {
  purchaseConfirmation = null;
}

async function confirmPurchase() {
  if (!purchaseConfirmation || !purchaseConfirmation.canAfford) return;
  
  isPurchasing = true;
  try {
    const response = await fetch('/api/purchase-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        itemId: purchaseConfirmation.item.id
      })
    });

    const result = await response.json();
    
    if (result.success) {
      // Update user currency
      userCurrency = result.currency;
      // Show success message (you could add a toast notification here)
      alert(`Successfully purchased ${purchaseConfirmation.item.name}!`);
    } else {
      alert(`Purchase failed: ${result.error.message}`);
    }
  } catch (error) {
    console.error('Purchase error:', error);
    alert('Purchase failed. Please try again.');
  } finally {
    isPurchasing = false;
    hidePurchaseConfirmation();
  }
}

onMount(loadShopData);
</script>

<svelte:head>
  <title>Shop ✦ Milkyway</title>
</svelte:head>

<main class="shop-page">
    


    <div class="axolotl-container">
        <img class="axolotl-top" src="/prompts/axolotl.png" alt="axolotl up top"/>
        <a class="back-button" href="/home">← back</a>
        <div class="shop-title">
            <h1>welcome to the shop!</h1>
            {#if isLoggedIn}
                <div class="shop-header-controls">
                    <div class="user-currency">
                        <div class="currency-item">
                            <img src="/coin.png" alt="coin" class="currency-icon" />
                            <span>{userCurrency.coins}</span>
                        </div>
                        <div class="currency-item">
                            <img src="/stellarship.png" alt="stellarship" class="currency-icon" />
                            <span>{userCurrency.stellarships}</span>
                        </div>
                        <div class="currency-item">
                            <img src="/paintchip.png" alt="paintchip" class="currency-icon" />
                            <span>{userCurrency.paintchips}</span>
                        </div>
                    </div>
                    <a href="/cart" class="cart-button">
                        📦 order history
                    </a>
                </div>
            {:else}
                <div class="login-prompt">
                    <p class="login-message">🔒 <a href="/">Log in</a> to purchase items and view your currency</p>
                </div>
            {/if}
        </div>
    
        <!-- Tab Navigation -->
        <div class="tab-navigation">
            <a href="/shop" class="tab-button active">
                prizes
            </a>
            <a href="/vote" class="tab-button">
                vote
            </a>
        </div>
    
        <div class="shop-items-container">
            {#if isLoading}
                <div class="loading-message">
                    <p>Loading shop items...</p>
                </div>
            {:else if prizesItems.length > 0}
                {#each prizesItems as item}
                    <div class="shop-item">
                        <div class="item-image">
                            {#if item.image && Array.isArray(item.image) && item.image.length > 0 && item.image[0] && typeof item.image[0] === 'object' && 'url' in item.image[0]}
                                <img src={item.image[0].url} alt={String(item.name || 'Shop item')} />
                            {:else}
                                <div class="placeholder-image">No Image</div>
                            {/if}
                        </div>
                        <div class="item-info">
                            <div class="item-header">
                                <h3 class="item-name">{item.name}</h3>
                        {#if isOneTimeItem(item)}
                            <div class="one-time-badge" role="img" aria-label="One-time purchase item">one-time only</div>
                        {/if}
                            </div>
                            <p class="item-description">{item.description}</p>
                        <div class="item-pricing">
                            {#if item.coins_cost}
                                <span class="price coins">
                                    <img src="/coin.png" alt="coin" class="currency-icon" />
                                    {item.coins_cost}
                                </span>
                            {/if}
                            {#if item.stellarships_cost}
                                <span class="price stellarships">
                                    <img src="/stellarship.png" alt="stellarship" class="currency-icon" />
                                    {item.stellarships_cost}
                                </span>
                            {/if}
                            {#if item.paintchips_cost}
                                <span class="price paintchips">
                                    <img src="/paintchip.png" alt="paintchip" class="currency-icon" />
                                    {item.paintchips_cost}
                                </span>
                            {/if}
                        </div>
                        {#if !isLoggedIn}
                            <button 
                                class="shop-button login-button" 
                                onclick={() => window.location.href = '/'}
                            >
                                log in to purchase
                            </button>
                        {:else if canAfford(item)}
                            <button 
                                class="shop-button purchase-button" 
                                onclick={() => showPurchaseConfirmation(item)}
                            >
                                purchase
                            </button>
                        {:else}
                            <button class="shop-button disabled-button" disabled>
                                insufficient funds
                            </button>
                        {/if}
                    </div>
                </div>
                {/each}
                <div class="coming-soon-message">
                    <p>+ more items coming soon...</p>
                </div>
            {:else}
                <div class="no-items-message">
                    <p>No items available at the moment.</p>
                </div>
            {/if}
        </div>
        
    </div>

    <!-- Purchase Confirmation Modal -->
    {#if purchaseConfirmation}
        <div 
            class="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabindex="-1"
            onclick={hidePurchaseConfirmation}
            onkeydown={(e) => e.key === 'Escape' && hidePurchaseConfirmation()}
            style="cursor: pointer;"
        >
            <div 
                class="modal-content" 
                role="document"
                onclick={(e) => e.stopPropagation()}
            >
                <h3 id="modal-title">Confirm Purchase</h3>
                <p>{purchaseConfirmation.message}</p>
                {#if !purchaseConfirmation.canAfford}
                    <p class="insufficient-funds">You don't have enough currency for this purchase.</p>
                {/if}
                <div class="modal-buttons">
                    <button 
                        class="modal-button cancel-button" 
                        onclick={hidePurchaseConfirmation}
                        disabled={isPurchasing}
                    >
                        cancel
                    </button>
                    <button 
                        class="modal-button confirm-button" 
                        onclick={confirmPurchase}
                        disabled={!purchaseConfirmation.canAfford || isPurchasing}
                    >
                        {isPurchasing ? 'purchasing...' : 'confirm'}
                    </button>
                </div>
            </div>
        </div>
    {/if}
  
</main>

<style>
        main {
    background-image: url("/milkyway bg.png");
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
    min-height: 100vh;
    width: 100%;
    box-sizing: border-box;

    position: relative;

    overflow-y: auto;
    overflow-x: hidden;
    }

    .axolotl-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
    .axolotl-top {
        margin: 0;
        padding: 0;
        display: block;
        height: 25vw;

    }

    .back-button {
        position: absolute;
        left: 11vw;
        top: 23vw;
        color: white;
    }

    .shop-title {
        margin: 0;
        border: 4px solid #E6819F;
        background-color: #EED4D4;
        padding: 24px;
        border-radius: 8px;
        width: 80%;
        text-align: center;
    }

    .shop-title h1 {
        margin: 0 0 16px 0;
        font-family: "Futura", sans-serif;
        color: #333;
    }

    .shop-header-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 16px;
        gap: 20px;
    }

    .user-currency {
        display: flex;
        gap: 20px;
    }

    .currency-item {
        display: flex;
        align-items: center;
        gap: 6px;
        background-color: white;
        border: 2px solid #E6819F;
        border-radius: 6px;
        padding: 8px 12px;
        font-family: "Futura", sans-serif;
        font-weight: 800;
        color: #333;
    }

    .currency-item .currency-icon {
        width: 16px;
        height: 16px;
        object-fit: contain;
        filter: drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white) drop-shadow(1px 1px 0 white);
    }

    .cart-button {
        padding: 8px 16px;
        background-color: #73ACE0;
        color: white;
        border: 2px solid #5A9BD4;
        border-radius: 6px;
        text-decoration: none;
        font-family: "Futura", sans-serif;
        font-weight: 800;
        font-size: 0.9em;
        transition: all 0.2s ease;
        white-space: nowrap;
    }

    .cart-button:hover {
        background-color: #5A9BD4;
        border-color: #4A8BC4;
        transform: translateY(-1px);
    }

    .login-prompt {
        margin-top: 16px;
        text-align: center;
    }

    .login-message {
        background-color: #FFF9E6;
        border: 2px solid #F7C881;
        border-radius: 8px;
        padding: 12px 16px;
        margin: 0;
        font-family: "Futura", sans-serif;
        font-weight: 600;
        color: #8B5A3C;
        font-size: 0.95em;
    }

    .login-message a {
        color: #E6819F;
        text-decoration: none;
        font-weight: 800;
    }

    .login-message a:hover {
        text-decoration: underline;
    }

    .shop-notice {
        margin: 20px 0 0 0;
        border: 4px solid #E6819F;
        background-color: #EED4D4;
        padding: 16px 24px;
        border-radius: 8px;
        width: 80%;
        text-align: center;
        font-family: "Futura", sans-serif;
    }

    .shop-notice h2 {
        margin: 0 0 8px 0;
        color: #E6819F;
        font-size: 1.4em;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .shop-notice p {
        margin: 0;
        color: #333;
        font-size: 0.95em;
        line-height: 1.4;
    }

    .tab-navigation {
        display: flex;
        gap: 10px;
        margin: 20px 0;
        justify-content: center;
    }

    .tab-button {
        padding: 10px 20px;
        border: 4px solid #F7C881;
        background-color: #FBF2BF;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 800;
        font-size: 0.9em;
        transition: all 0.2s ease;
        color: #333;
        font-family: "Futura", sans-serif;
        text-decoration: none;
        display: inline-block;
    }

    .tab-button:hover {
        background-color: white;
        transform: translateY(-1px);
    }

    .tab-button.active {
        background-color: #E6819F;
        color: white;
        border-color: #E6819F;
        transform: translateY(-1px);
    }

    .shop-items-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        width: 90%;
        max-width: 1200px;
        margin: 30px auto 0;
        padding: 20px;
    }

    .shop-item {
        background-color: #FBF2BF;
        border: 4px solid #F7C881;
        border-radius: 8px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        transition: all 0.2s ease;
        font-family: "Futura", sans-serif;
    }

    .shop-item:hover {
        background-color: white;
        transform: translateY(-2px);
    }

    .item-info {
        width: 100%;
    }

    .item-image {
        width: 100%;
        height: 160px;
        margin-bottom: 12px;
        border-radius: 6px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #ffffffaa;
        border: 2px solid white;
    }

    .item-image img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        filter: drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white) drop-shadow(1px 1px 0 white);
    }

    .placeholder-image {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #ffffffaa;
        color: #666;
        font-style: italic;
        font-size: 0.9em;
    }

    .item-header {
        margin-bottom: 8px;
    }

    .item-name {
        margin: 0 0 4px 0;
        color: #333;
        font-size: 1.1em;
        font-weight: 800;
        font-family: "Futura", sans-serif;
        line-height: 1.2;
    }

    .one-time-badge {
        background-color: #E6819F;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.7em;
        font-weight: 800;
        font-family: "Futura", sans-serif;
        display: inline-block;
        margin-top: 4px;
    }

    .item-description {
        margin: 0 0 12px 0;
        color: #666;
        line-height: 1.3;
        flex-grow: 1;
        font-size: 0.9em;
        width: 100%;
    }

    .item-pricing {
        display: flex;
        gap: 8px;
        justify-content: center;
        flex-wrap: wrap;
        align-items: center;
        width: 100%;
    }

    .price {
        padding: 6px 10px;
        border-radius: 6px;
        font-weight: 800;
        font-size: 0.85em;
        display: flex;
        align-items: center;
        gap: 4px;
        border: 2px solid white;
        font-family: "Futura", sans-serif;
    }
    

    .currency-icon {
        width: 14px;
        height: 14px;
        object-fit: contain;
        filter: drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white) drop-shadow(1px 1px 0 white);
    }

    .price.coins {
        background-color: #FBF2BF;
        color: #8B4513;
        border-color: #F7C881;
    }

    .price.stellarships {
        background-color: #73ACE0;
        color: #191970;
        border-color: #5A9BD4;
    }

    .price.paintchips {
        background-color: #FFD1DC;
        color: #8B008B;
        border-color: #FFB6C1;
    }

    .shop-button {
        margin-top: 12px;
        padding: 8px 16px;
        border-radius: 8px;
        font-family: "Futura", sans-serif;
        font-weight: 800;
        font-size: 0.8em;
        width: 100%;
        transition: all 0.2s ease;
        cursor: pointer;
    }

    .purchase-button {
        border: 4px solid #E6819F;
        background-color: #EED4D4;
        color: #333;
    }

    .purchase-button:hover {
        background-color: white;
        transform: translateY(-1px);
    }

    .disabled-button {
        border: 4px solid #ccc;
        background-color: #f0f0f0;
        color: #999;
        cursor: not-allowed;
        opacity: 0.6;
    }

    .login-button {
        border: 4px solid #F7C881;
        background-color: #FFF9E6;
        color: #8B5A3C;
    }

    .login-button:hover {
        background-color: #F7C881;
        color: white;
        transform: translateY(-1px);
    }

    .disabled-button:hover {
        transform: none;
        background-color: #f0f0f0;
    }

    .no-items-message {
        grid-column: 1 / -1;
        text-align: center;
        padding: 30px;
        background-color: #ffffffaa;
        border: 4px solid white;
        border-radius: 8px;
        color: #666;
        font-style: italic;
        font-size: 1em;
        font-family: "Futura", sans-serif;
    }

    .coming-soon-message {
        grid-column: 1 / -1;
        text-align: center;
        margin-top: 20px;
        padding: 16px;
        background-color: #ffffffaa;
        border: 4px solid white;
        border-radius: 8px;
        color: #666;
        font-family: "Futura", sans-serif;
        font-weight: 500;
    }

    .coming-soon-message p {
        margin: 0;
        font-size: 0.9em;
    }

    .loading-message {
        grid-column: 1 / -1;
        text-align: center;
        padding: 50px;
        background-color: #ffffffaa;
        border: 4px solid white;
        border-radius: 8px;
        color: #666;
        font-family: "Futura", sans-serif;
        font-size: 1.1em;
        font-weight: 600;
    }

    .loading-message p {
        margin: 0;
        animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
        0%, 100% {
            opacity: 0.6;
        }
        50% {
            opacity: 1;
        }
    }

    /* Modal Styles */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal-content {
        background-color: #FBF2BF;
        border: 4px solid #F7C881;
        border-radius: 8px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        font-family: "Futura", sans-serif;
    }

    .modal-content h3 {
        margin: 0 0 16px 0;
        color: #333;
        font-size: 1.2em;
        font-weight: 800;
    }

    .modal-content p {
        margin: 0 0 20px 0;
        color: #666;
        line-height: 1.4;
    }

    .insufficient-funds {
        color: #E6819F !important;
        font-weight: 600;
        margin-bottom: 20px !important;
    }

    .modal-buttons {
        display: flex;
        gap: 12px;
        justify-content: center;
    }

    .modal-button {
        padding: 10px 20px;
        border-radius: 8px;
        font-family: "Futura", sans-serif;
        font-weight: 800;
        font-size: 0.9em;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 4px solid;
        min-width: 80px;
    }

    .cancel-button {
        background-color: #f0f0f0;
        border-color: #ccc;
        color: #666;
    }

    .cancel-button:hover:not(:disabled) {
        background-color: white;
        transform: translateY(-1px);
    }

    .confirm-button {
        background-color: #E6819F;
        border-color: #E6819F;
        color: white;
    }

    .confirm-button:hover:not(:disabled) {
        background-color: #D4708F;
        border-color: #D4708F;
        transform: translateY(-1px);
    }

    .modal-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .axolotl-top {
            height: 35vw;
        }

        .back-button {
            left: 5vw;
            top: 30vw;
        }

        .shop-title {
            width: 90%;
            padding: 20px;
        }

        .shop-header-controls {
            flex-direction: column;
            gap: 16px;
            align-items: center;
        }

        .user-currency {
            flex-wrap: wrap;
            justify-content: center;
            gap: 12px;
        }

        .shop-items-container {
            width: 95%;
            grid-template-columns: 1fr;
        }

        .shop-notice {
            width: 90%;
            padding: 12px 16px;
        }

        .shop-notice h2 {
            font-size: 1.2em;
        }

        .shop-notice p {
            font-size: 0.85em;
        }

        .modal-content {
            width: 95%;
            padding: 20px;
        }

        .one-time-badge {
            font-size: 0.65em;
            padding: 1px 4px;
            margin-top: 2px;
        }
    }

</style>