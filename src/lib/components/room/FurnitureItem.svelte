<script>
  let { 
    furnitureInfo = $bindable(), 
    x, 
    y, 
    selected = $bindable(false), 
    onSelect, 
    onMouseDown = null, 
    onRemoveFromRoom, 
    isRoomEditing = false, 
    readOnly = false
  } = $props();

  // Use derived state that stays in sync with furnitureInfo.flipped
  let isFlipped = $derived(furnitureInfo.flipped || false);

  // Map furniture types to their SVG stroke files
  // Some furniture share the same stroke, and some don't have strokes
  /** @type {Record<string, string>} */
  const furnitureStrokeMap = {
    'beanbag_white': 'beanbag_stroke.svg',
    'beanbag_yellow': 'beanbag_stroke.svg',
    'bed_simple_blue': 'bed_stroke.svg',
    'bed_simple_green': 'bed_stroke.svg',
    'bed_simple_red': 'bed_stroke.svg',
    'bed_simple_yellow': 'bed_stroke.svg',
    'bedside_round': 'bedside_round_stroke.svg',
    'bedside_white': 'bedside_stroke.svg',
    'bedside_wooden': 'bedside_stroke.svg',
    'sofa_blue': 'sofa_stroke.svg',
    'sofa_red': 'sofa_stroke.svg',
    'cow_statue': 'cow_statue_stroke.svg'
  };

  // Only cow_statue has a physical _flipped.png file
  const hasFlippedImage = ['cow_statue'];

  // Get furniture assets based on type and flipped state
  const furnitureAssets = $derived(() => {
    const type = String(furnitureInfo.type || 'cow_statue');
    const hasPhysicalFlip = hasFlippedImage.includes(type);
    const suffix = (isFlipped && hasPhysicalFlip) ? '_flipped' : '';
    
    // Get stroke SVG
    const strokeFile = furnitureStrokeMap[type] || 'cow_statue_stroke.svg';
    const strokeSuffix = (isFlipped && type === 'cow_statue') ? '_flipped' : '';
    const strokePath = strokeFile.replace('_stroke.svg', `${strokeSuffix}_stroke.svg`);
    
    return {
      image: `/room/${type}${suffix}.png`,
      stroke: `/room/${strokePath}`,
      useCssFlip: isFlipped && !hasPhysicalFlip
    };
  });

  // Toggle flip
  async function toggleFlip() {
    const newFlippedState = !isFlipped;
    
    // Optimistically update local state
    furnitureInfo.flipped = newFlippedState;
    
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
            position: `${Math.round(x)},${Math.round(y)},${newFlippedState ? '1' : '0'}`
          }
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        console.error('Failed to update furniture flip:', result.error);
        // Revert on failure
        furnitureInfo.flipped = !newFlippedState;
      }
    } catch (error) {
      console.error('Error updating furniture flip:', error);
      // Revert on failure
      furnitureInfo.flipped = !newFlippedState;
    }
  }
</script>

<div 
  class="furniture-item {selected ? 'selected' : ''} {isRoomEditing ? 'editing-mode' : ''}" 
  style:--x={x} 
  style:--y={y}
  style:--z={Math.round(y)}
  onclick={(e) => {
    e.stopPropagation();
    if (isRoomEditing && onSelect) onSelect();
  }}
  onmousedown={(e) => {
    if (isRoomEditing && onMouseDown) {
      e.stopPropagation();
      onMouseDown(e);
    }
  }}
  role="button"
  tabindex={isRoomEditing ? 0 : -1}
>
  <img 
    class="furniture-img {furnitureAssets().useCssFlip ? 'css-flipped' : ''}" 
    src={furnitureAssets().image} 
    alt="Furniture" 
  />

  {#if isRoomEditing}
    <img 
      class="furniture-stroke {furnitureAssets().useCssFlip ? 'css-flipped' : ''}"
      src={furnitureAssets().stroke} 
      alt="Furniture outline" 
    />
  {/if}

  {#if selected && isRoomEditing && !readOnly}
    <div class="furniture-controls">
      <button class="rotate-furniture-btn" onclick={toggleFlip} aria-label="Flip furniture">
        ↻
      </button>
      <button class="delete-furniture-btn" onclick={() => { if (onRemoveFromRoom) onRemoveFromRoom(furnitureInfo.id); }} aria-label="Remove furniture from room">
        🗑️
      </button>
    </div>
  {/if}
</div>

<style>
.furniture-item {
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

.furniture-item.editing-mode .furniture-img {
  pointer-events: none;
}

.furniture-item.editing-mode.selected .furniture-img {
  filter: drop-shadow(-6px -6px 0 var(--orange)) drop-shadow(6px -6px 0 var(--orange)) drop-shadow(-6px 6px 0 var(--orange)) drop-shadow(6px 6px 0 var(--orange));
}

.furniture-img {
  width: auto;
  height: auto;
  position: absolute;
  transition: filter 0.2s;
  transform: scale(0.3);
}

.furniture-img.css-flipped {
  transform: scale(0.3) scaleX(-1);
}

.furniture-stroke {
  position: absolute;
  width: auto;
  height: auto;
  transform: scale(0.3);
}

.furniture-stroke.css-flipped {
  transform: scale(0.3) scaleX(-1);
}

.furniture-item.editing-mode:hover .furniture-img, 
.furniture-item.editing-mode.selected .furniture-img {
  filter: drop-shadow(-6px -6px 0 var(--orange)) drop-shadow(6px -6px 0 var(--orange)) drop-shadow(-6px 6px 0 var(--orange)) drop-shadow(6px 6px 0 var(--orange));
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

.rotate-furniture-btn,
.delete-furniture-btn {
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

.delete-furniture-btn:hover {
  background: #ff4444;
  border-color: #ff4444;
  color: white;
}
</style>

