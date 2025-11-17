<script>
	import DevlogPopup from '../devlogs/DevlogPopup.svelte';
	import Quests from './tamagotchi/Quests.svelte';
	import { onMount } from 'svelte';

	let tamagotchiData = $state(null);
	let isLoading = $state(true);
	let userStreak = $state(null);
	let hasPostedToday = $state(null);
	let isEditingName = $state(false);
	let newName = $state('');
	let displayedMessage = $state('');
	let isTyping = $state(false);
	let serverTimeInfo = $state(null);
	let countdown = $state('');
	let countdownInterval = null;
	let currentCleanup = null;
	let showDevlogInterface = $state(false);
	let isCreating = $state(false);

	const moodMessages = {
		happy: [
			'yay!!!!!',
			'keep it up! i believe in you!',
			"i actually have a twin named mimo! i wonder what they're up to...",
			'did you know axolotls can actually regenerate themselves? so cool!',
			'writing devlogs is so much fun!!!'
		],
		sad: [
			'ue 🥺e e e😭 💧🥺😭Uueuuue.💧ue 😭💧ue e😭😭eeeeee💧💧💧uu🥺😭 hh 😭🥺uUEEE🥺😭😭 UEE😭🥺💧Eu💧💧E E😭😭 E EUE🥺🥺😭 UEE😭🥺💧Eu💧💧E E🥺😭Uueuuue.💧ue 😭🥺ee e🥺🥺😭eUEE 💧🥺💧EEE 💧💧😭–😭EE H💧🥺😭E EUU💧🥺😭UUEHH🥺😭EUEH🥺',
			'... 😔',
			'please write a devlog today...',
			"i'm feeling a bit lonely...",
			'did you know axolotls can actually regenerate themselves? i wish i could do that with my feelings...',
			'writing devlogs makes me happy...'
		]
	};

	function handleStreakUpdate(event) {
		const e = event;
		if (e.detail?.streak != null) {
			userStreak = e.detail.streak;
			hasPostedToday = true;
		}
	}
	const streakListener = (ev) => handleStreakUpdate(ev);

	function typewriterEffect(text, callback) {
		displayedMessage = '';
		isTyping = true;
		let index = 0;
		const speed = 50;
		const timeoutIds = [];
		function typeChar() {
			if (index < text.length) {
				displayedMessage += text[index++];
				const id = setTimeout(typeChar, speed);
				timeoutIds.push(id);
			} else {
				isTyping = false;
				callback && callback();
			}
		}
		typeChar();
		return () => timeoutIds.forEach((id) => clearTimeout(id));
	}

	async function fetchServerTime() {
		try {
			const res = await fetch('/api/server-time');
			serverTimeInfo = await res.json();
			updateCountdown();
			if (countdownInterval) clearInterval(countdownInterval);
			countdownInterval = setInterval(updateCountdown, 1000);
		} catch (e) {
			console.error('Failed to fetch server time', e);
		}
	}

	function updateCountdown() {
		if (!serverTimeInfo) return;
		const now = Date.now();
		const targetMs = new Date(serverTimeInfo.nextDayStart).getTime();
		const diff = targetMs - now;
		if (diff <= 0) {
			countdown = '00:00:00';
			return;
		}
		const h = Math.floor(diff / 3600000);
		const m = Math.floor((diff % 3600000) / 60000);
		const s = Math.floor((diff % 60000) / 1000);
		countdown = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
			.toString()
			.padStart(2, '0')}`;
	}

	let previousMood = '';
	/** @type {'happy'|'sad'|null} */
	let mood = $derived.by(() => {
		if (userStreak === null || hasPostedToday === null) return null;
		if (!hasPostedToday) return 'sad';
		return 'happy';
	});

	$effect.pre(() => {
		if (mood && mood !== previousMood) {
			previousMood = mood;
			if (currentCleanup) currentCleanup();
			const msgs = moodMessages[mood];
			const msg = msgs[Math.floor(Math.random() * msgs.length)];
			currentCleanup = typewriterEffect(msg);
		}
	});

	onMount(() => {
		fetchTamagotchiData();
		fetchUserData();
		fetchServerTime();
		window.addEventListener('streak-updated', streakListener);
		return () => {
			window.removeEventListener('streak-updated', streakListener);
			if (countdownInterval) clearInterval(countdownInterval);
			if (currentCleanup) currentCleanup();
		};
	});

	async function fetchTamagotchiData() {
		try {
			const response = await fetch('/api/get-user-tamagotchi');
			const data = await response.json();
			if (data.tamagotchi) tamagotchiData = data.tamagotchi;
		} catch (err) {
			console.error('Error fetching tamagotchi data:', err);
		} finally {
			isLoading = false;
		}
	}

	async function fetchUserData() {
		try {
			const response = await fetch('/api/get-user-data');
			const data = await response.json();
			if (data.success && data.user) {
				userStreak = data.user.devlogStreak || 0;
				hasPostedToday = data.user.hasPostedToday || false;
			}
		} catch (err) {
			console.error('Error fetching user data:', err);
		}
	}

	async function createTamagotchi() {
		if (isCreating) return;
		isCreating = true;
		try {
			const res = await fetch('/api/create-tamagotchi', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			const data = await res.json();
			if (data.tamagotchi) {
				tamagotchiData = data.tamagotchi;
			}
		} catch (err) {
			console.error('Error creating tamagotchi:', err);
		} finally {
			isCreating = false;
		}
	}

	async function handleDevlogSubmit(formData) {
		try {
			const res = await fetch('/api/create-devlog', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			let data;
			try {
				data = await res.json();
			} catch (e) {
				// Server may return non-JSON (e.g., CSRF text). Fallback to text for better error message.
				const text = await res.text().catch(() => '');
				data = { error: text || 'Unexpected non-JSON response' };
			}
			if (res.ok && data.success) {
				showDevlogInterface = false;
				await fetchUserData();
				window.dispatchEvent(new CustomEvent('streak-updated', { detail: { streak: userStreak } }));
			} else {
				console.error('Failed to create devlog:', data.error);
				alert(`Failed to create devlog: ${data.error || 'Unknown error'}`);
			}
		} catch (error) {
			console.error('Error creating devlog:', error);
			alert('Failed to create devlog. Please try again.');
		}
	}

	function startEditingName() {
		isEditingName = true;
		newName = tamagotchiData?.name || '';
	}
	async function saveName() {
		if (!newName.trim()) {
			alert('Name cannot be empty');
			return;
		}
		try {
			const res = await fetch('/api/update-tamagotchi', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newName })
			});
			const data = await res.json();
			if (res.ok && data.tamagotchi) {
				if (tamagotchiData) tamagotchiData.name = newName;
				isEditingName = false;
			} else {
				console.error('Failed to update name:', data.error);
				alert(`Failed to update name: ${data.error || 'Unknown error'}`);
			}
		} catch (error) {
			console.error('Error updating name:', error);
			alert('Failed to update name. Please try again.');
		}
	}
	function cancelEditingName() {
		isEditingName = false;
		newName = '';
	}
	/** @param {KeyboardEvent} e */
	function handleKeydown(e) {
		if (e.key === 'Enter') saveName();
		else if (e.key === 'Escape') cancelEditingName();
	}
</script>

<div class="tamagotchi-container">
	{#if isLoading}
		<p>Loading...</p>
	{:else if tamagotchiData}
		<div class="sprite" data-mood={mood}>
			<img src={`/tamagotchi/mimi-${mood}.png`} alt="mimi!" height={256} width={256} />
		</div>

		<div class="name">
			{#if isEditingName}
				<input type="text" bind:value={newName} onkeydown={handleKeydown} class="name-input" />
				<div class="name-buttons">
					<button onclick={saveName} class="save-btn">Save</button>
					<button onclick={cancelEditingName} class="cancel-btn">Cancel</button>
				</div>
			{:else}
				<button type="button" onclick={startEditingName} class="name-display">
					{tamagotchiData.name}
				</button>
			{/if}
		</div>

		<div class="message-box">
			<p>{displayedMessage}<span class="cursor" class:hidden={!isTyping}></span></p>
		</div>

		<Quests />

		{#if serverTimeInfo}
			<div class="countdown-box" data-posted={hasPostedToday}>
				{#if hasPostedToday}
					<p class="countdown-label">next day begins in:</p>
				{:else}
					<p class="countdown-label">time left to post today:</p>
				{/if}
				<p class="countdown-timer">{countdown}</p>
			</div>
		{/if}

		<button class="post-btn" onclick={() => (showDevlogInterface = true)}>Post Devlog</button>
	{:else}
		<div class="empty">
			<div class="egg">
				<img src="/tamagotchi/tamagotchi_egg.png" width="72" height="85" alt="tamagotchi egg" />
			</div>
			<button onclick={() => createTamagotchi()} class="hatch-button">hatch me!</button>
		</div>
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
		background-color: var(--yellow, #fbf2bf);
		border: 3px solid var(--orange, #f7c881);
		border-radius: 8px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		min-width: 300px;
		max-width: 400px;
		width: 100%;
	}

	.sprite {
		font-size: 56px;
		text-align: center;
		background-color: #e8ddc4;
		border: 4px solid var(--orange, #f7c881);
		border-radius: 12px;
		padding: 16px;
		width: 100%;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 300px;
		box-shadow: inset 0 4px 8px rgba(0, 0, 0, 0.1);
		position: relative;
	}

	.sprite img {
		display: block;
		max-width: 100%;
		height: auto;
	}

	.message-box {
		background-color: white;
		border: 2px solid var(--orange, #f7c881);
		border-radius: 12px;
		padding: 12px 16px;
		min-height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		position: relative;
	}

	.message-box p {
		margin: 0;
		font-size: 14px;
		line-height: 1.4;
		text-align: center;
		color: #333;
		min-height: 20px;
	}

	.cursor {
		display: inline-block;
		width: 2px;
		height: 1em;
		background-color: #333;
		margin-left: 2px;
		animation: blink 0.7s infinite;
	}

	.cursor.hidden {
		display: none;
	}

	@keyframes blink {
		0%,
		49% {
			opacity: 1;
		}
		50%,
		100% {
			opacity: 0;
		}
	}

	.name {
		text-align: center;
	}

	.name-display {
		cursor: pointer;
		transition: opacity 0.2s;
		margin: 0;
	}

	.name-display:hover {
		opacity: 0.7;
	}

	.name-input {
		border: 2px solid var(--orange, #f7c881);
		border-radius: 4px;
		font-size: 16px;
		font-family: inherit;
		margin-bottom: 8px;
	}

	.name-buttons {
		display: flex;
		gap: 8px;
		justify-content: center;
	}

	.save-btn,
	.cancel-btn {
		padding: 6px 12px;
		font-size: 12px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: transform 0.1s;
	}

	.save-btn {
		background-color: #4caf50;
		color: white;
	}

	.cancel-btn {
		background-color: #f44336;
		color: white;
	}

	.post-btn,
	button {
		background-color: var(--orange, #f7c881);
		border: 2px solid #e5b873;
		border-radius: 6px;
		padding: 10px 20px;
		font-family: 'Futura', sans-serif;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.1s;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.empty img {
		width: 72px;
		height: 85px;
	}

	.egg {
		font-size: 64px;
		margin: 0 0 12px 0;
		animation: bounce 1s ease-in-out infinite;
	}

	@keyframes bounce {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(5px);
		}
	}

	.hatch-button {
		border: 2px solid var(--orange, #f7c881);
		border-radius: 4px;
		font-size: 16px;
		font-family: inherit;
		margin-bottom: 8px;
	}

	.countdown-box {
		width: 100%;
		background: #fff;
		border: 2px solid var(--orange, #f7c881);
		border-radius: 8px;
		padding: 8px 12px;
		text-align: center;
		box-sizing: border-box;
		font-family: 'Futura', sans-serif;
	}
	.countdown-label {
		margin: 0;
		font-size: 12px;
		color: #555;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		font-weight: 600;
	}
	.countdown-timer {
		margin: 4px 0 0 0;
		font-size: 20px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: #222;
	}
</style>
