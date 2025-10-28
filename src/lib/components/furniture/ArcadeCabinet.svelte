<script>
	import ArcadePlayer from '$lib/components/furniture/arcade-cabinet/ArcadePlayer.svelte';
	import CabinetSettings from '$lib/components/furniture/arcade-cabinet/CabinetSettings.svelte';

	let { data, mode, id } = $props();

	let arcadeData = $state(data ? JSON.parse(data) : '');

	async function onSave(newArcadeData) {
		try {
			const response = await fetch('/api/furniture', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					furnitureId: id,
					updates: { data: JSON.stringify(newArcadeData) }
				})
			});

			const result = await response.json();

			if (result.success) {
				arcadeData = newArcadeData;
				location.reload();
			} else {
				console.error('Failed to save:', result.error);
				alert('Failed to save. Please try again.');
			}
		} catch (error) {
			console.error('Error saving:', error);
			alert('Error saving. Please try again.');
		}
	}
</script>

<div class="arcade-cabinet">
	{#if mode === 'view'}
		<ArcadePlayer terminalData={arcadeData} />
	{:else if mode === 'edit'}
		<CabinetSettings terminalData={arcadeData} saveTerminal={onSave} />
	{:else}
		<span class="placeholder-text">Failed to display cabinet.</span>
	{/if}
</div>

<style>
	.arcade-cabinet {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		position: absolute;
	}

	.placeholder-text {
		background-color: #fbf2bf;
		border: 3px solid #f7c881;
		font-family: 'Futura', sans-serif;
		border-radius: 8px;
		padding: 16px;
		font-size: 1.2rem;
		color: #888;
		white-space: nowrap;
	}
</style>
