<script>
	import DevlogInterface from './tamagotchi/DevlogInterface.svelte';

	let { tamagotchiData = $bindable() } = $props();

	let inputName = $state(tamagotchiData?.name || '');
	let points = $state(tamagotchiData?.points || 0);

	let showDevlogInterface = $state(false);

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

	async function handleDevlogSubmit(formData) {
		try {
			const res = await fetch('/api/create-devlog', {
				method: 'POST',
				body: formData
			});

			const data = await res.json();

			if (res.ok && data.success) {
				console.log('Devlog created successfully:', data.devlog);
				showDevlogInterface = false;
			} else {
				console.error('Failed to create devlog:', data.error);
				alert(`Failed to create devlog: ${data.error || 'Unknown error'}`);
			}
		} catch (error) {
			console.error('Error creating devlog:', error);
			alert('Failed to create devlog. Please try again.');
		}
	}
</script>

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
		<h4>Devlogs</h4>
		<button
			onclick={() => {
				showDevlogInterface = true;
			}}>Create Devlog</button
		>
	</div>
</div>

{#if showDevlogInterface}
	<DevlogInterface
		onClose={() => {
			showDevlogInterface = false;
		}}
		onSubmit={handleDevlogSubmit}
	/>
{/if}

<style>
	.tamagotchi-container {
		background-color: #fbf2bf;
		border: 3px solid #f7c881;
		border-radius: 8px;
		gap: 16px;
		padding: 16px;
		align-items: center;
	}
</style>
