<script>
	import { onMount } from 'svelte';

	let quests = [];
	let loading = true;
	let error = null;
	let claimingQuest = null;

	async function fetchQuests() {
		loading = true;
		error = null;
		try {
			const response = await fetch('/api/quests');
			const data = await response.json();

			if (data.success) {
				quests = data.quests;
			} else {
				error = data.error || 'Failed to load quests';
			}
		} catch (err) {
			console.error('Error fetching quests:', err);
			error = 'Failed to load quests';
		} finally {
			loading = false;
		}
	}

	async function claimQuest(questId) {
		if (claimingQuest) return;

		claimingQuest = questId;
		try {
			const response = await fetch('/api/quests/claim', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ questId })
			});

			const data = await response.json();

			if (data.success) {
				await fetchQuests();
			} else {
				alert(data.error || 'Failed to claim quest');
			}
		} catch (err) {
			console.error('Error claiming quest:', err);
			alert('Failed to claim quest');
		} finally {
			claimingQuest = null;
		}
	}

	onMount(() => {
		fetchQuests();
	});

	$: completedCount = quests.filter((q) => q.isCompleted).length;
</script>

<div class="tamagotchi-quests">
	<div class="quest-header">
		<h3>quests</h3>
		<div class="quest-count">{completedCount}/{quests.length}</div>
	</div>

	{#if loading}
		<div class="status-msg">loading...</div>
	{:else if error}
		<div class="status-msg error">{error}</div>
	{:else if quests.length === 0}
		<div class="status-msg">no quests available (yet...)</div>
	{:else}
		<div class="quest-list">
			{#each quests as quest (quest.id)}
				<div
					class="quest-item"
					class:completed={quest.isCompleted}
					class:claimable={quest.canClaim}
				>
					<div class="quest-info">
						<div class="quest-title">{quest.name}</div>
						{#if quest.description}
							<div class="quest-description">{quest.description}</div>
						{/if}
					</div>
					<button
						class="checkbox"
						class:checked={quest.isCompleted}
						class:ready={quest.canClaim}
						on:click={() => quest.canClaim && claimQuest(quest.id)}
						disabled={!quest.canClaim || claimingQuest === quest.id}
					>
						{#if quest.isCompleted}
							<span class="checkmark">✓</span>
						{/if}
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.tamagotchi-quests {
		width: 100%;
		max-height: 400px;
		display: flex;
		flex-direction: column;
		background: #fbf2bf;
		border: 3px solid #f7c881;
		border-radius: 8px;
		padding: 16px;
	}

	.quest-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
		padding-bottom: 12px;
		border-bottom: 2px solid #f7c881;
	}

	h3 {
		margin: 0;
		font-size: 1.2rem;
		color: #333;
		font-weight: bold;
	}

	.quest-count {
		font-size: 0.95rem;
		color: #666;
		font-weight: bold;
	}

	.status-msg {
		text-align: center;
		padding: 32px;
		color: #999;
		font-size: 0.9rem;
	}

	.status-msg.error {
		color: #ff4444;
	}

	.quest-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.quest-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 8px;
		transition: background 0.2s;
		cursor: pointer;
	}

	.quest-item:last-child {
		border-bottom: none;
	}

	.quest-item.completed {
		opacity: 0.5;
	}

	.quest-item.completed .quest-title {
		text-decoration: line-through;
		color: #999;
	}

	.quest-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.quest-title {
		font-size: 0.95rem;
		color: #333;
		font-weight: 500;
	}

	.quest-description {
		font-size: 0.8rem;
		color: #666;
		line-height: 1.3;
	}

	.quest-item.completed .quest-description {
		color: #999;
	}

	.checkbox {
		width: 22px;
		height: 22px;
		border: 2px solid #ccc;
		border-radius: 4px;
		background: white;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 0;
	}

	.checkbox:hover:not(:disabled) {
		border-color: #999;
	}

	.checkbox.ready {
		border-color: #667eea;
		background: #667eea;
	}

	.checkbox.ready:hover:not(:disabled) {
		background: #5568d3;
		border-color: #5568d3;
	}

	.checkbox.checked {
		border-color: #4caf50;
		background: #4caf50;
	}

	.checkbox:disabled {
		cursor: default;
		opacity: 0.7;
	}

	.checkmark {
		color: white;
		font-size: 0.9rem;
		font-weight: bold;
	}
</style>
