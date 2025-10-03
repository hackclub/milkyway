<script>

</script>

<svelte:head>
  <title>Shop ✦ Milkyway</title>
</svelte:head>

<main class="shop-page">
    


    <div class="axolotl-container">
        <img class="axolotl-top" src="/prompts/axolotl.png" />
        <a class="back-button" href="/home">← back</a>
        <h1 class="shop-title">welcome to the shop!</h1>
    
    </div>
  
</main>

<style>
        main {
    background-image: url("/milkyway bg.png");
    background-size: cover;
    background-position: center;
    height: 100%;
    width: 100%;
    box-sizing: border-box;

    position: absolute;

    overflow: hidden;
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

</style>