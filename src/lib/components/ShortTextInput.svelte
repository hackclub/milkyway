
<script>
  let { value = $bindable(), placeholder, onclick} = $props();
  
  // Normalize email input to lowercase
  /**
   * @param {Event} event
   */
  function handleInput(event) {
    const target = /** @type {HTMLInputElement} */ (event.target);
    if (placeholder && placeholder.toLowerCase().includes('email')) {
      value = target.value.toLowerCase().trim();
    } else {
      value = target.value;
    }
  }
</script>

<div class="text-input">
  <input bind:value={value} {placeholder} oninput={handleInput}/>
  <button {onclick}><slot></slot></button>
</div>


<style>


.text-input {
  display: inline-block;
  background-color: var(--yellow);
  border: 4px solid var(--orange);
  border-radius: 50px;
  transition: 0.2s;
  overflow: hidden;
}

.text-input input, .text-input button {
  outline: none;
  border: none;
  background: none;
  font-family: inherit;
  width: auto;
  font-size: inherit;

}

.text-input input {
  padding: 8px;
  padding-left: 16px;
  height: 100%;
}

.text-input button {
  background-color: var(--orange);
  padding: 8px;
  padding-right: 16px;
  height: 100%;
  transition: 0.2s;
}

.text-input:has(button:hover) {
  background-color: var(--orange)
}




</style>
