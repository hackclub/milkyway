<script>
	import BulletinBoardEditor from '$lib/components/furniture/bulletin-board/BulletinBoardEditor.svelte';
	import BulletinBoardView from '$lib/components/furniture/bulletin-board/BulletinBoardView.svelte';

	let { data, mode, id } = $props();

	let bulletinBoardData = $state(data ? JSON.parse(data) : { components: [] });

	async function onSave(newBulletinBoardData) {
		try {
			const response = await fetch('/api/furniture', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					furnitureId: id,
					updates: { data: JSON.stringify(newBulletinBoardData) }
				})
			});

			const result = await response.json();

			if (result.success) {
				bulletinBoardData = newBulletinBoardData;
				location.reload();
			} else {
				console.error('Failed to save bulletin board:', result.error);
				alert('Failed to save bulletin board. Please try again.');
			}
		} catch (error) {
			console.error('Error saving bulletin board:', error);
			alert('Error saving bulletin board. Please try again.');
		}
	}
</script>

<div class="bulletin-board">
	{#if mode === 'view'}
		<BulletinBoardView {bulletinBoardData} />
	{:else if mode === 'edit'}
		<BulletinBoardEditor {bulletinBoardData} saveData={onSave} />
	{:else}
		<span class="placeholder-text">Failed to display bulletin board.</span>
	{/if}
</div>

<style>
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
