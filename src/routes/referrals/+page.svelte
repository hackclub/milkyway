<script>
	let { data } = $props();
	let copyButtonText = $state('copy link');
	let claimingStates = $state(/** @type {Record<string, string>} */ ({}));
	let lastClaimedReward = $state(/** @type {null | { item: string, details: any, checkpoint: any }} */ (null));
	let hoveredCheckpoint = $state(/** @type {any} */ (null));
	const checkpoints = [
		{
			referralCount: 3,
			reward: 'free sticker',
			image: '/referrals/rewards/sticker.png',
			claimableItem: 'sticker'
		},
		{
			referralCount: 5,
			reward: 'furniture pack!',
			image: '/referrals/rewards/furniture.png',
			claimableItem: 'furniture',
			furnitureItems: [
				{ name: 'brown clock', image: '/room/clock_brown.png' },
				{ name: 'floor lamp', image: '/room/floor_lamp.png' },
				{ name: 'teddy bear', image: '/room/teddybear.png' },
				{ name: 'short shelf', image: '/room/shelf.png' },
				{ name: 'fireplace', image: '/room/fireplace.png' }
			]
		},
		{
			referralCount: 10,
			reward: 'sticker sheet',
			image: '/referrals/rewards/sticker sheet.png',
			claimableItem: 'stickersheet'
		},
		{
			referralCount: 15,
			reward: '10 coins :)',
			image: '/coin.png',
			claimableItem: 'coins10'
		},
		{
			referralCount: 25,
			reward: 'milkyway pin',
			image: '/referrals/rewards/pin.png',
			claimableItem: 'pin'
		},
		{
			referralCount: 35,
			reward: '30 coins :o',
			image: '/coin.png',
			claimableItem: 'coins30'
		},
		{
			referralCount: 50,
			reward: 'hoodie!',
			image: '/referrals/rewards/hoodie.png',
			claimableItem: 'hoodie'
		}
	];

	async function claimReward(/** @type {any} */ checkpoint) {
		try {
			claimingStates[checkpoint.claimableItem] = 'claiming';
			
			const response = await fetch('/api/claim-referral-reward', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					item: checkpoint.claimableItem,
					referralCount: checkpoint.referralCount
				})
			});

			if (response.ok) {
				const result = await response.json();
				claimingStates[checkpoint.claimableItem] = 'claimed';
				
				// Also add to the data.claimedItems array
				if (!data.claimedItems.includes(checkpoint.claimableItem)) {
					data.claimedItems.push(checkpoint.claimableItem);
				}

				// Store details about what was claimed
				if (result.rewardDetails) {
					lastClaimedReward = {
						item: checkpoint.claimableItem,
						details: result.rewardDetails,
						checkpoint: checkpoint
					};
				}

				// Refresh the page after a short delay for coins to update UI
				if (checkpoint.claimableItem.startsWith('coins')) {
					setTimeout(() => {
						window.location.reload();
					}, 2000);
				}
			} else {
				const error = await response.json();
				alert(error.error || 'Failed to claim reward');
				claimingStates[checkpoint.claimableItem] = 'error';
			}
		} catch (error) {
			console.error('Error claiming reward:', error);
			alert('Failed to claim reward');
			claimingStates[checkpoint.claimableItem] = 'error';
		}
	}

	function getClaimButtonText(/** @type {any} */ checkpoint) {
		if (!checkpoint.claimableItem) return null;
		
		if (claimingStates[checkpoint.claimableItem] === 'claimed' || 
			data.claimedItems?.includes(checkpoint.claimableItem)) {
			// For coins and furniture, show "claimed!"
			if (checkpoint.claimableItem.startsWith('coins') || checkpoint.claimableItem === 'furniture') {
				return 'claimed!';
			}
			return 'claimed - coming soon!';
		}
		
		if (claimingStates[checkpoint.claimableItem] === 'claiming') {
			return 'claiming...';
		}
		
		return 'claim reward';
	}

	function isClaimButtonDisabled(/** @type {any} */ checkpoint) {
		if (!checkpoint.claimableItem) return true;
		
		// Disabled if already claimed
		if (data.claimedItems?.includes(checkpoint.claimableItem) || 
			claimingStates[checkpoint.claimableItem] === 'claimed') {
			return true;
		}
		
		// Disabled if currently claiming
		if (claimingStates[checkpoint.claimableItem] === 'claiming') {
			return true;
		}
		
		// Disabled if not enough referrals
		if ((data.referralCount ?? 0) < checkpoint.referralCount) {
			return true;
		}
		
		return false;
	}
	// Calculate the index of the checkpoint the player is between based on referralCount
	// Returns:
	//   0   if referralCount < checkpoints[0].referralCount
	//   1   if between checkpoint 0 and 1
	//   2   if between checkpoint 1 and 2
	//  etc.
	function getPlayerPosition() {
		const rc = data.referralCount ?? 0;
		let index = 0;
		for (let i = 0; i < checkpoints.length; i++) {
			console.log(rc, checkpoints[i].referralCount, i);
			if (rc == checkpoints[i].referralCount) {
				index = i;
				break;
			} else if (rc < checkpoints[i].referralCount) {
				index = i - 1 + 0.5;
				break;
			}
			index = i + 0.5;
		}
		return index;
	}
	const playerPosition = getPlayerPosition();
	console.log(playerPosition);
	let playerY = $state(0);
	let playerRotation = $state(0);
	if (playerPosition % 2 == 0) {
		playerY = 25;
	} else if (playerPosition % 1 == 0) {
		playerY = 47;
	} else {
		playerY = 40;
		if ((playerPosition - 0.5) % 2 == 0) {
			playerRotation = 20;
		} else {
			playerRotation = -20;
		}
	}
</script>

<svelte:head>
	<title>Referrals ✦ Milkyway</title>
</svelte:head>

{#if lastClaimedReward}
	<div class="reward-notification">
		<button class="close-notification" onclick={() => (lastClaimedReward = null)}>×</button>
		<h3>reward claimed!</h3>
		{#if lastClaimedReward.item === 'furniture'}
			<p>you received the furniture pack:</p>
			<div class="claimed-furniture-grid">
				{#each lastClaimedReward.checkpoint.furnitureItems as item}
					<div class="claimed-furniture-item">
						<img src={item.image} alt={item.name} />
						<p>{item.name}</p>
					</div>
				{/each}
			</div>
			<p style="margin-top: 16px; font-weight: bold;">check your inventory in your room!</p>
		{:else if lastClaimedReward.item === 'coins10'}
			<p>you received 10 coins!</p>
		{:else if lastClaimedReward.item === 'coins30'}
			<p>you received 30 coins!</p>
		{:else}
			<p>you claimed: {lastClaimedReward.checkpoint.reward}</p>
			<p>check your inbox for shipping details!</p>
		{/if}
	</div>
{/if}

<main>
	<div class="referral-info-box">
		<h3>get rewards for referrals!</h3>
		<div class="referral-link">
			{#if data.user?.username}
				https://milkyway.hackclub.com?from={data.user.username}
			{:else}
				https://milkyway.hackclub.com
			{/if}
		</div>
		<div class="button-group">
			<button
				class="copy-button"
				onclick={() => {
					const link = data.user?.username
						? `https://milkyway.hackclub.com?from=${encodeURIComponent(data.user.username)}`
						: 'https://milkyway.hackclub.com';
					navigator.clipboard.writeText(link);
					copyButtonText = 'copied!';
					setTimeout(() => {
						copyButtonText = 'copy link';
					}, 2000);
				}}
			>
				{copyButtonText}
			</button>
			<a href="/poster" class="poster-button"> view posters </a>
		</div>
	</div>
	<div class="way">
		<p>
			<a
				href="/home"
				style:color="white"
				style:margin-left="20px"
				style:margin-top="20px"
				style:text-decoration="none">← back</a
			>
		</p>
		<div
			class="mimi-container"
			style:left="calc({playerPosition} * 69vh + 32vh)"
			style:top="calc({playerY}vh)"
			style:transform="rotate({playerRotation}deg)"
		>
			<p>you have {data.referralCount} referrals!</p>
			<img src="/referrals/mimi.png" alt="Mimi character" style:width="15vh" class="mimi" />
		</div>
		{#each checkpoints as checkpoint, index}
			<div 
				class="checkpoint" 
				style:--index={index}
				role="button"
				tabindex="0"
				onmouseenter={() => checkpoint.furnitureItems ? hoveredCheckpoint = checkpoint : null}
				onmouseleave={() => hoveredCheckpoint = null}
			>
				<div class="textbox" style:padding-top="4vh">
					<p>{checkpoint.referralCount} referrals</p>
					<p style:margin-top="-2vh">{checkpoint.reward}</p>
				</div>
				<img
					src="/referrals/star.png"
					alt="checkpoint"
					class="star"
					style:margin-left="2vh"
					style:width="20vh"
				/>
				<img
					src={checkpoint.image}
					alt={checkpoint.reward}
					style:width="18vh"
					style:margin-top="15h"
				/>
				{#if checkpoint.claimableItem}
					<button
						class="claim-button"
						class:claimed={data.claimedItems?.includes(checkpoint.claimableItem) || claimingStates[checkpoint.claimableItem] === 'claimed'}
						disabled={isClaimButtonDisabled(checkpoint)}
						onclick={() => claimReward(checkpoint)}
					>
						{getClaimButtonText(checkpoint)}
					</button>
				{/if}

				{#if hoveredCheckpoint === checkpoint && checkpoint.furnitureItems}
					<div class="furniture-tooltip">
						<p style="font-weight: bold; margin-bottom: 8px;">includes:</p>
						<div class="furniture-grid">
							{#each checkpoint.furnitureItems as item}
								<div class="furniture-item">
									<img src={item.image} alt={item.name} />
									<p>{item.name}</p>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</main>

<style>
	main {
		background-color: #101628;
		height: 100%;
		width: 100%;
		box-sizing: border-box;
		justify-content: center;
		align-items: center;
		overflow-x: scroll;
		overflow-y: hidden;
		position: relative;
	}
	.referral-info-box {
		position: fixed;
		bottom: 20px;
		left: 20px;
		background-color: var(--yellow);
		border-radius: 12px;
		padding: 16px;
		z-index: 200;
		max-width: 320px;
		font-family:
			'Futura LT',
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
	}
	.referral-info-box h3 {
		margin: 0 0 12px 0;
		font-size: 1.1rem;
		color: #101628;
		font-weight: 600;
		text-align: center;
	}
	.referral-link {
		border-radius: 8px;
		padding: 10px;
		margin-bottom: 12px;
		font-size: 0.85rem;
		color: #333;
		word-break: break-all;
		line-height: 1.4;
	}
	.button-group {
		display: flex;
		gap: 8px;
	}
	.copy-button,
	.poster-button {
		flex: 1;
		padding: 10px 16px;
		border: none;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			transform 0.2s,
			opacity 0.2s;
		text-decoration: none;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.copy-button {
		background-color: #739ace;
		color: white;
	}
	.poster-button {
		background-color: #d9869f;
		color: white;
	}
	.copy-button:hover,
	.poster-button:hover {
		opacity: 0.9;
	}
	.mimi-container p {
		color: black;
		text-align: center;
		font-weight: bold;
	}
	.mimi-container {
		position: absolute;
		top: 50vh;
		z-index: 100;
	}
	.way {
		position: relative;
		background-image: url('/referrals/way.png');
		background-repeat: repeat-x;
		background-size: contain;
		background-position: -1080px 0;
		height: 100vh;
		width: 500vh;
		box-sizing: border-box;
	}
	.checkpoint {
		position: absolute;
		left: calc(var(--index) * 69vh + 32vh);
		top: 25vh;
		display: flex;
		flex-flow: column;
		height: 65%;
		justify-content: space-between;
		align-items: center;
	}
	.checkpoint:nth-child(odd) {
		top: 5vh;
	}
	.checkpoint .star {
		width: 20vh;
	}
	.textbox {
		background-image: url('/referrals/talk.png');
		background-size: contain;
		background-repeat: no-repeat;
		width: 20vh;
		height: 20vh;
		padding: 10%;
		text-align: center;
	}
	.claim-button {
		margin-top: 2vh;
		padding: 1vh 2vh;
		background-color: #739ace;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1.6vh;
		font-weight: 600;
		cursor: pointer;
		transition:
			opacity 0.2s,
			background-color 0.2s;
		font-family:
			'Futura LT',
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
		white-space: nowrap;
	}
	.claim-button:hover:not(:disabled) {
		opacity: 0.9;
	}
	.claim-button:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}
	.claim-button.claimed {
		background-color: #5a9c5a;
	}
	.reward-notification {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background-color: var(--yellow);
		border-radius: 16px;
		padding: 24px 32px;
		z-index: 300;
		max-width: 500px;
		max-height: 80vh;
		overflow-y: auto;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
		font-family:
			'Futura LT',
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
		animation: slideIn 0.3s ease-out;
	}
	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translate(-50%, -40%);
		}
		to {
			opacity: 1;
			transform: translate(-50%, -50%);
		}
	}
	.reward-notification h3 {
		margin: 0 0 16px 0;
		font-size: 1.5rem;
		color: #101628;
		text-align: center;
	}
	.reward-notification p {
		margin: 8px 0;
		color: #101628;
		text-align: center;
		line-height: 1.5;
	}
	.close-notification {
		position: absolute;
		top: 12px;
		right: 12px;
		background: none;
		border: none;
		font-size: 2rem;
		cursor: pointer;
		color: #101628;
		line-height: 1;
		padding: 0;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: opacity 0.2s;
	}
	.close-notification:hover {
		opacity: 0.7;
	}
	.furniture-tooltip {
		position: absolute;
		bottom: -10vh;
		left: 50%;
		transform: translateX(-50%);
		background-color: rgba(16, 22, 40, 0.95);
		border: 2px solid var(--yellow);
		border-radius: 12px;
		padding: 12px 16px;
		z-index: 200;
		min-width: 240px;
		pointer-events: none;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
	}
	.furniture-tooltip p {
		color: var(--yellow);
		margin: 0;
		font-size: 1.4vh;
		text-align: center;
	}
	.furniture-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin-top: 8px;
	}
	.furniture-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}
	.furniture-item img {
		width: 60px;
		height: 60px;
		object-fit: contain;
	}
	.furniture-item p {
		font-size: 1.2vh;
		color: white;
		text-align: center;
		line-height: 1.2;
	}
	.claimed-furniture-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		margin: 16px 0;
		padding: 12px;
		background-color: rgba(255, 255, 255, 0.1);
		border-radius: 8px;
	}
	.claimed-furniture-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}
	.claimed-furniture-item img {
		width: 70px;
		height: 70px;
		object-fit: contain;
		background-color: rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		padding: 4px;
	}
	.claimed-furniture-item p {
		font-size: 0.85rem;
		color: #101628;
		text-align: center;
		line-height: 1.2;
		font-weight: 600;
	}
</style>
