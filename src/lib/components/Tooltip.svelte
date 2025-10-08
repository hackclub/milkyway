<script>
  let { text, position = 'bottom' } = $props();
</script>

<div class="tooltip-container">
  <slot />
  <div class="tooltip" class:tooltip-top={position === 'top'}>
    {text}
  </div>
</div>

<style>
  .tooltip-container {
    position: relative;
    display: inline-block;
    
  }

  .tooltip {
    font-size: 0.7em;
    visibility: hidden;
    opacity: 0;
    position: absolute;
    top: 125%;
    left: 50%;
    transform: translateX(-50%);
    background-color: #333;
    color: white;
    text-align: center;
    padding: 8px 12px;
    border-radius: 6px;
    white-space: normal;
    max-width: 350px;
    min-width: 200px;
    word-wrap: break-word;
    z-index: 1000;
    transition: opacity 0.3s, visibility 0.3s;
    pointer-events: none;
  }

  .tooltip::after {
    content: "";
    position: absolute;
    bottom: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: transparent transparent #333 transparent;
  }

  .tooltip-top {
    top: auto;
    bottom: 125%;
  }

  .tooltip-top::after {
    bottom: auto;
    top: 100%;
    border-color: #333 transparent transparent transparent;
  }

  .tooltip-container:hover .tooltip {
    visibility: visible;
    opacity: 90%;
  }
</style>
