<script>
let {
  onOpenFaq
} = $props();

</script>

<!-- Bottom navigation buttons -->
<div class="zlayer bottom-buttons">
  <a href="/friends" class="bottom-button">
    <img src="/friends.png" alt="Friends" />
    <span>friends</span>
  </a>
  <div class="bottom-right-buttons">
  <a href="/leaderboard" class="bottom-button">
    <img src="/leaderboard.png" alt="Shop" />
    <span class="leaderboard">leaderboard</span>
  </a>

  <a href="/shop" class="bottom-button">
    <img src="/shop.png" alt="Shop" />
    <span>shop</span>
  </a>
  </div>
</div>

<!-- FAQ button -->
<div class="zlayer faq-button">
  <button class="faq-icon" onclick={onOpenFaq} aria-label="Open FAQ">
    <img src="/mimi_faq.png" alt="FAQ" />
  </button>
</div>

<style>
.zlayer {
  position: absolute;
  top: 0;
  left: 0;
}

.bottom-buttons {
  z-index: 1;
  bottom: 0;
  width: 100%;
  top: auto;
  display: flex;
  flex-flow: row;
  justify-content: space-between;
  align-items: flex-end;
  padding: 30px;
  pointer-events: none;
}

.bottom-buttons a {
  padding: 18px;
  font-size: inherit;
  font-family: inherit;
}

.bottom-button {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 4px;
  border: 2px solid white;
  aspect-ratio: 1;
  padding: 1000px;
  width: auto;
  height: 6em;
  box-sizing: border-box;
  border-radius: 8px;
  background-color: #ffffff25;
  color: white;
  text-decoration: none;
  transition: 0.2s;
  cursor: pointer;
  pointer-events: all;
}

.bottom-right-buttons {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.bottom-button img {
  height: 80%;
}

.bottom-button span {
  margin: 0;
  padding: 0;
  color: inherit;
}

.bottom-button:hover {
  background-color: white;
  color: black;
}

.leaderboard {
  font-size: 0.8em;
}

.faq-button {
  z-index: 2;
  bottom: 0;
  left: 200px;
  top: auto;
}

.faq-icon {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  display: block;
  line-height: 0;
  position: relative;
}

.faq-icon img {
  width: auto;
  height: 100px;
  display: block;
}

.faq-icon:hover img {
  opacity: 0;
}

.faq-icon::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 110%;
  background-image: url('/mimi_faq_hover.png');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: bottom;
  opacity: 0;
  pointer-events: none;
}

.faq-icon:hover::after {
  opacity: 1;
}
</style>

