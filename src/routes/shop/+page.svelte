<script>
let { data } = $props();

let activeTab = $state('prizes');

// Filter items by type
const prizesItems = $derived(data.shopItems.filter(item => item.type === 'prizes'));
const furnitureItems = $derived(data.shopItems.filter(item => item.type === 'furniture'));
const currentItems = $derived(activeTab === 'prizes' ? prizesItems : furnitureItems);
</script>

<svelte:head>
  <title>Shop ✦ Milkyway</title>
</svelte:head>

<main class="shop-page">
    


    <div class="axolotl-container">
        <img class="axolotl-top" src="/prompts/axolotl.png" alt="axolotl up top"/>
        <a class="back-button" href="/home">← back</a>
        <h1 class="shop-title">welcome to the shop!</h1>
    
        <!-- Tab Navigation -->
        <div class="tab-navigation">
            <button 
                class="tab-button" 
                class:active={activeTab === 'prizes'}
                onclick={() => activeTab = 'prizes'}
            >
                prizes
            </button>
            <button 
                class="tab-button" 
                class:active={activeTab === 'furniture'}
                onclick={() => activeTab = 'furniture'}
            >
                furniture
            </button>
        </div>
    
        <div class="shop-items-container">
            {#if currentItems.length > 0}
                {#each currentItems as item}
                    <div class="shop-item">
                        <div class="item-image">
                            {#if item.image && Array.isArray(item.image) && item.image.length > 0 && item.image[0] && typeof item.image[0] === 'object' && 'url' in item.image[0]}
                                <img src={item.image[0].url} alt={String(item.name || 'Shop item')} />
                            {:else}
                                <div class="placeholder-image">No Image</div>
                            {/if}
                        </div>
                        <div class="item-info">
                            <h3 class="item-name">{item.name}</h3>
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
                        </div>
                        <button class="shop-button" disabled>
                            shop coming soon!
                        </button>
                    </div>
                </div>
                {/each}
            {:else}
                <div class="no-items-message">
                    <p>No {activeTab} available at the moment.</p>
                </div>
            {/if}
             <div class="coming-soon-message">
                <p>+ more items coming soon...</p>
             </div>
        </div>
        
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

    .item-name {
        margin: 0 0 8px 0;
        color: #333;
        font-size: 1.1em;
        font-weight: 800;
        font-family: "Futura", sans-serif;
    }

    .item-description {
        margin: 0 0 12px 0;
        color: #666;
        line-height: 1.3;
        flex-grow: 1;
        font-size: 0.9em;
    }

    .item-pricing {
        display: flex;
        gap: 8px;
        justify-content: center;
        flex-wrap: wrap;
        align-items: center;
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

    .shop-button {
        margin-top: 12px;
        padding: 8px 16px;
        border: 4px solid #ccc;
        background-color: #f0f0f0;
        border-radius: 8px;
        color: #999;
        font-family: "Futura", sans-serif;
        font-weight: 800;
        font-size: 0.8em;
        cursor: not-allowed;
        width: 100%;
        transition: none;
    }

    .shop-button:disabled {
        opacity: 0.6;
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

</style>