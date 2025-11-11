<script>
	let { tamagotchiData = $bindable(), onClose } = $props();

	let inputName = $state(tamagotchiData?.name || '');
	let points = $state(tamagotchiData?.points || 0);

	async function createTamagotchi() {
		const res = await fetch('/api/create-tamagotchi', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			}
		});
		const data = await res.json();
		if (data.tamagotchi) {
			tamagotchiData = data.tamagotchi;
		}
	}

	async function updateTamagotchi(name) {
		const res = await fetch('/api/update-tamagotchi', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ name: name, points: points })
		});
		console.log({ name: name, points: points });
		const data = await res.json();
		if (data.tamagotchi) {
			tamagotchiData = data.tamagotchi;
		}
	}
</script>

<div class="backdrop" onclick={() => onClose()}></div>
<div class="tamagotchi-container">
	<div>
		<button onclick={() => createTamagotchi()} disabled={tamagotchiData}>Create Tamagotchi</button>
		<h4>Update Tamagotchi</h4>
		<div>
			<input type="text" placeholder="name" bind:value={inputName} /><input
				type="number"
				placeholder="points"
				bind:value={points}
			/>
		</div>
		<button onclick={() => updateTamagotchi(inputName)}>Update Tamagotchi</button>
	</div>
</div>

<style>
	.tamagotchi-container {
		position: absolute;
		display: flex;
		background-color: #fbf2bf;
		border: 3px solid #f7c881;
		border-radius: 8px;
		flex-direction: column;
		gap: 16px;
		padding: 16px;
		align-items: center;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 9999;
	}

	.backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 9998;
	}
</style>
