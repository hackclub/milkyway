<script>
  let { 
    icon = "+", 
    expandedText = "create new project +", 
    expandedWidth = "200px",
    onClick,
    ...restProps 
  } = $props();
</script>

<button 
  class="expandable-button" 
  onclick={onClick}
  style="--expanded-width: {expandedWidth}"
  {...restProps}
>
  
  <span class="button-text">{expandedText}</span>
  <span class="button-icon">{icon}</span>
</button>

<style>
  .expandable-button {
    background-color: #ffffff25;
    border: 2px solid white;
    color: white;
    border-radius: 30px;
    width: 40px;
    height: 40px;
    cursor: pointer;
    display: flex;
    flex-flow: row;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
    padding-right: 11px;
    font-family: inherit;
    transition: all 0.3s ease;
    overflow: hidden;
  }

  .expandable-button:hover {
    width: var(--expanded-width);
    border-radius: 30px;
    transform: translateX(calc(-1 * var(--expanded-width) + 40px));
  }

  .button-icon {
    font-size: 1.2em;
    transition: 0.2s;
    margin-top: -4px;
    margin-bottom: -4px;
  }

  .button-text {
    opacity: 0;
    white-space: nowrap;
    transition: opacity 0.3s ease;
  }

  .expandable-button:hover .button-text {
    opacity: 1;
  }
</style>
