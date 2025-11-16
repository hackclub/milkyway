<script>

var floors = [
  ['wood', 'wood', 'wood', 'wood', 'wood', 'wood', ],
  ['wood', 'wood', 'wood', 'wood', 'wood', 'wood', ],
  ['wood', 'wood', 'wood', 'wood', 'wood', 'wood', ],
  ['wood', 'wood', 'wood', 'wood', 'wood', 'wood', ],
  ['wood', 'wood', 'wood', 'wood', 'wood', 'wood', ],
  ['wood', 'wood', 'wood', 'wood', 'wood', 'wood', ]
]

</script>
<div class="floor" style:--num-width={floors[0].length} style:--num-height={floors.length}>
	{#each floors as row, i}
		{#each row as tile, j}
			<img
				class="tile"
				style:--x={j}
				style:--y={i}
				src="/room/floor/{tile}.png"
				draggable="false"
			/>
		{/each}
	{/each}
</div>

<style>

:root {
  --tile-width: 96px;
  --tile-height: calc(0.587 * var(--tile-width));

}

.floor {
  position: absolute;

  margin-left: calc(-1 * var(--tile-width));

}

.tile {
  width: var(--tile-width);
  position: absolute;
  left: calc(
    (var(--x) - var(--y))
    * var(--tile-width) / 2 );
  top: calc(
    (var(--x) + var(--y))
    * var(--tile-height) / 2);
}

</style>
