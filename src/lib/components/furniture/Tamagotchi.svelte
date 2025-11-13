<script>
	import DevlogPopup from '../devlogs/DevlogPopup.svelte';
	import { onMount } from 'svelte';

	let tamagotchiData = $state(null);
	let isLoading = $state(true);

	onMount(() => {
		fetch('/api/get-user-tamagotchi', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.tamagotchi) {
					tamagotchiData = data.tamagotchi;
					name = tamagotchiData.name;
					points = tamagotchiData.points;
				}
				isLoading = false;
			})
			.catch((err) => {
				console.error('Error fetching tamagotchi data:', err);
			});
	});

	let name = $state('');
	let points = $state(0);

	let showDevlogInterface = $state(false);

	async function createTamagotchi() {
		isLoading = true;
		const res = await fetch('/api/create-tamagotchi', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			}
		});
		const data = await res.json();
		if (data.tamagotchi) {
			tamagotchiData = data.tamagotchi;
			name = tamagotchiData.name;
			points = tamagotchiData.points;
			isLoading = false;
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
	{#if isLoading}
		<p>Loading Tamagotchi...</p>
	{:else if tamagotchiData}
		<div>
			<h4>Update Tamagotchi</h4>
			<div>
				<input type="text" placeholder="name" bind:value={name} /><input
					type="number"
					placeholder="points"
					bind:value={points}
				/>
			</div>
			<button onclick={() => updateTamagotchi(name)}>Update Tamagotchi</button>
			<h4>Devlogs</h4>
			<button
				onclick={() => {
					showDevlogInterface = true;
				}}>Create Devlog</button
			>
			<button
				onclick={() => {
					fetch('/api/get-user-devlogs', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ username: 'genr234' })
					})
						.then((response) => response.json())
						.then((data) => {
							console.log('User Devlogs:', data.devlogs);
						})
						.catch((err) => {
							console.error('Error fetching user devlogs:', err);
						});
				}}
			>
				View Devlogs
			</button>
		</div>
	{:else}
		<p>No Tamagotchi found.</p>
		<button onclick={() => createTamagotchi()}>Create Tamagotchi</button>
	{/if}
</div>

{#if showDevlogInterface}
	<DevlogPopup
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
