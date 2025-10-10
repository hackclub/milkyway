<script>
  let { 
    furnitureInfo = $bindable(), 
    x, 
    y, 
    selected = $bindable(false), 
    onSelect, 
    onMouseDown = null, 
    onDelete, 
    isRoomEditing = false, 
    readOnly = false
  } = $props();

  let isFlipped = $state(furnitureInfo.flipped || false);

  // Get furniture assets based on type and flipped state
  const furnitureAssets = $derived(() => {
    const type = furnitureInfo.type || 'cow_statue';
    const suffix = isFlipped ? '_flipped' : '';
    return {
      image: `/room/${type}${suffix}.png`,
      stroke: `/room/${type}${suffix}_stroke.svg`
    };
  });

  // Toggle flip
  async function toggleFlip() {
    isFlipped = !isFlipped;
    
    // Update the furniture in the database
    try {
      const response = await fetch('/api/furniture', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          furnitureId: furnitureInfo.id,
          updates: {
            position: `${Math.round(x)},${Math.round(y)},${isFlipped ? '1' : '0'}`
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Update local state
        furnitureInfo.flipped = isFlipped;
      } else {
        console.error('Failed to update furniture flip:', result.error);
        // Revert on failure
        isFlipped = !isFlipped;
      }
    } catch (error) {
      console.error('Error updating furniture flip:', error);
      // Revert on failure
      isFlipped = !isFlipped;
    }
  }
</script>

<div 
  class="furniture-item {selected ? 'selected' : ''} {isRoomEditing ? 'editing-mode' : ''}" 
  style:--x={x} 
  style:--y={y}
  style:--z={Math.round(y)}
  onclick={(e) => e.stopPropagation()}
>
  <img class="furniture-img" src={furnitureAssets().image} alt="Furniture" />

  {#if isRoomEditing}
    <button 
      class="furniture-hitbox" 
      onclick={() => { if (onSelect) onSelect(); }} 
      onmousedown={(e) => { if (onMouseDown) { e.stopPropagation(); onMouseDown(e); } }}
      aria-label="Select furniture"
    >
      <img src={furnitureAssets().stroke} alt="Furniture outline" />
    </button>
  {/if}

  {#if selected && isRoomEditing && !readOnly}
    <div class="furniture-controls">
      <button class="rotate-furniture-btn" onclick={toggleFlip} aria-label="Flip furniture">
        ↻
      </button>
    </div>
  {/if}
</div>

<style>
.furniture-item {
  height: 12%;
  position: absolute;
  z-index: calc(100 + var(--z));

  display: flex;
  justify-content: center;
  align-items: center;

  transform: translate(calc(var(--x) * 1px), calc(var(--y) * 1px));
}

.furniture-item.selected {
  z-index: calc(1000 + var(--z));
}

.furniture-item.editing-mode {
  cursor: grab;
}

.furniture-item.editing-mode.selected {
  cursor: grab;
}

.furniture-item.editing-mode.selected .furniture-img {
  filter: drop-shadow(-2px -2px 0 var(--orange)) drop-shadow(2px -2px 0 var(--orange)) drop-shadow(-2px 2px 0 var(--orange)) drop-shadow(2px 2px 0 var(--orange));
  pointer-events: none;
}

.furniture-img {
  height: 100%;
  position: absolute;
  transition: filter 0.2s;
}

.furniture-hitbox {
  height: 85%;
  position: absolute;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.furniture-item.editing-mode .furniture-hitbox {
  cursor: move;
}

.furniture-hitbox img {
  height: 100%;
  width: auto;
}

.furniture-item.editing-mode:has(.furniture-hitbox:hover) .furniture-img, 
.furniture-item.editing-mode.selected .furniture-img {
  filter: drop-shadow(-2px -2px 0 var(--orange)) drop-shadow(2px -2px 0 var(--orange)) drop-shadow(-2px 2px 0 var(--orange)) drop-shadow(2px 2px 0 var(--orange));
}

/* Furniture controls */
.furniture-controls {
  position: absolute;
  top: -50px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 1500;
}

.rotate-furniture-btn {
  padding: 6px 12px 10px;
  border: 2px solid var(--orange);
  border-radius: 50px;
  background: var(--yellow);
  color: var(--orange);
  font-family: inherit;
  font-size: 1em;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  line-height: 1;
}

.rotate-furniture-btn:hover {
  background: var(--orange);
  color: white;
  transform: rotate(180deg);
}
</style>

