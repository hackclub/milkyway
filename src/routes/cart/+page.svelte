<script>
import { onMount } from 'svelte';

let { data } = $props();

let purchases = $state(/** @type {any[]} */ ([]));
let isLoading = $state(true);
let error = $state(/** @type {string | null} */ (null));

async function loadPurchaseHistory() {
  try {
    const response = await fetch('/api/get-purchase-history');
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        purchases = result.purchases || [];
      } else {
        error = result.error?.message || 'Failed to load purchase history';
      }
    } else {
      error = 'Failed to load purchase history';
    }
  } catch (err) {
    console.error('Error loading purchase history:', err);
    error = 'Failed to load purchase history';
  } finally {
    isLoading = false;
  }
}

function formatDate(/** @type {string} */ dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getTotalCost(/** @type {any} */ purchase) {
  const costs = [];
  if (purchase.coins_price > 0) costs.push(`${purchase.coins_price} coins`);
  if (purchase.stellarships_price > 0) costs.push(`${purchase.stellarships_price} stellarships`);
  if (purchase.paintchips_price > 0) costs.push(`${purchase.paintchips_price} paintchips`);
  return costs.join(', ');
}

onMount(loadPurchaseHistory);
</script>

<svelte:head>
  <title>Order History ✦ Milkyway</title>
</svelte:head>

<main class="cart-page">
  <div class="axolotl-container">
    <img class="axolotl-top" src="/prompts/axolotl.png" alt="axolotl up top"/>
    <a class="back-button" href="/shop">← back to shop</a>
    
    <div class="cart-title">
      <h1>your order history</h1>
      <p class="cart-subtitle">track your purchases and fulfillment status</p>
    </div>

    {#if isLoading}
      <div class="loading-message">
        <p>Loading your orders...</p>
      </div>
    {:else if error}
      <div class="error-message">
        <p>{error}</p>
      </div>
    {:else if purchases.length === 0}
      <div class="no-orders-message">
        <p>You haven't made any purchases yet!</p>
        <a href="/shop" class="shop-link">start shopping</a>
      </div>
    {:else}
      <div class="orders-container">
        {#each purchases as purchase}
          <div class="order-card">
            <div class="order-header">
              <div class="order-info">
                <h3 class="order-title">
                  {purchase.item?.name || 'Unknown Item'}
                </h3>
                <p class="order-date">{formatDate(purchase.created)}</p>
              </div>
              <div class="fulfillment-status" class:fulfilled={purchase.fulfilled_on}>
                {#if purchase.fulfilled_on}
                  <div class="fulfilled-info">
                    <span class="fulfilled-text">✓ fulfilled</span>
                    <span class="fulfilled-date">on {formatDate(purchase.fulfilled_on)}</span>
                  </div>
                {:else}
                  ⏳ pending
                {/if}
              </div>
            </div>

            <div class="order-details">
              {#if purchase.item}
                <div class="item-details">
                  <div class="item-image">
                    {#if purchase.item.image && Array.isArray(purchase.item.image) && purchase.item.image.length > 0 && purchase.item.image[0] && typeof purchase.item.image[0] === 'object' && 'url' in purchase.item.image[0]}
                      <img src={purchase.item.image[0].url} alt={String(purchase.item.name || 'Shop item')} />
                    {:else}
                      <div class="placeholder-image">No Image</div>
                    {/if}
                  </div>
                  <div class="item-info">
                    <p class="item-description">{purchase.item.description || 'No description available'}</p>
                    <div class="item-cost">
                      <span class="cost-label">paid:</span>
                      <span class="cost-amount">{getTotalCost(purchase)}</span>
                    </div>
                  </div>
                </div>
              {/if}

              {#if purchase.notes}
                <div class="order-notes">
                  <span class="notes-label">notes:</span>
                  <span class="notes-text">{purchase.notes}</span>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
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
    text-decoration: none;
    font-family: "Futura", sans-serif;
    font-weight: 600;
    transition: opacity 0.2s ease;
  }

  .back-button:hover {
    opacity: 0.8;
  }

  .cart-title {
    margin: 0;
    border: 4px solid #E6819F;
    background-color: #EED4D4;
    padding: 24px;
    border-radius: 8px;
    width: 80%;
    text-align: center;
    margin-bottom: 30px;
  }

  .cart-title h1 {
    margin: 0 0 8px 0;
    font-family: "Futura", sans-serif;
    color: #333;
    font-size: 1.5em;
    font-weight: 800;
  }

  .cart-subtitle {
    margin: 0;
    color: #666;
    font-family: "Futura", sans-serif;
    font-size: 0.9em;
  }

  .loading-message, .error-message, .no-orders-message {
    text-align: center;
    padding: 50px;
    background-color: #ffffffaa;
    border: 4px solid white;
    border-radius: 8px;
    color: #666;
    font-family: "Futura", sans-serif;
    font-size: 1.1em;
    font-weight: 600;
    max-width: 600px;
    width: 90%;
  }

  .error-message {
    color: #E6819F;
  }

  .no-orders-message {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .shop-link {
    color: #E6819F;
    text-decoration: none;
    font-weight: 800;
    padding: 8px 16px;
    border: 2px solid #E6819F;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .shop-link:hover {
    background-color: #E6819F;
    color: white;
  }

  .orders-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 90%;
    max-width: 800px;
    margin: 0 auto;
  }

  .order-card {
    background-color: #FBF2BF;
    border: 4px solid #F7C881;
    border-radius: 8px;
    padding: 20px;
    font-family: "Futura", sans-serif;
    transition: all 0.2s ease;
  }

  .order-card:hover {
    background-color: white;
    transform: translateY(-2px);
  }

  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
  }

  .order-title {
    margin: 0 0 4px 0;
    color: #333;
    font-size: 1.2em;
    font-weight: 800;
  }

  .order-date {
    margin: 0;
    color: #666;
    font-size: 0.9em;
  }

  .fulfillment-status {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.85em;
    font-weight: 800;
    background-color: #FFD1DC;
    color: #8B008B;
    border: 2px solid #FFB6C1;
  }

  .fulfillment-status.fulfilled {
    background-color: #D4F1D4;
    color: #2D5A2D;
    border-color: #A8E6A8;
  }

  .fulfilled-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .fulfilled-text {
    font-weight: 800;
    font-size: 0.85em;
  }

  .fulfilled-date {
    font-weight: 600;
    font-size: 0.75em;
    opacity: 0.9;
  }

  .order-details {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .item-details {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .item-image {
    width: 80px;
    height: 80px;
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #ffffffaa;
    border: 2px solid white;
    flex-shrink: 0;
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
    font-size: 0.8em;
  }

  .item-info {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .item-description {
    margin: 0;
    color: #666;
    line-height: 1.3;
    font-size: 0.9em;
  }

  .item-cost {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cost-label {
    font-weight: 600;
    color: #333;
    font-size: 0.85em;
  }

  .cost-amount {
    font-weight: 800;
    color: #E6819F;
    font-size: 0.85em;
  }

  .order-notes {
    padding: 12px;
    background-color: #ffffffaa;
    border: 2px solid white;
    border-radius: 6px;
    display: flex;
    gap: 8px;
  }

  .notes-label {
    font-weight: 600;
    color: #333;
    font-size: 0.85em;
    flex-shrink: 0;
  }

  .notes-text {
    color: #666;
    font-size: 0.9em;
    line-height: 1.3;
  }

  @media (max-width: 768px) {
    .axolotl-top {
      height: 35vw;
    }

    .back-button {
      left: 5vw;
      top: 30vw;
    }

    .cart-title {
      width: 90%;
      padding: 20px;
    }

    .orders-container {
      width: 95%;
    }

    .order-header {
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }

    .item-details {
      flex-direction: column;
      gap: 12px;
    }

    .item-image {
      width: 100%;
      height: 120px;
    }

    .fulfilled-info {
      gap: 1px;
    }

    .fulfilled-date {
      font-size: 0.7em;
    }
  }
</style>
