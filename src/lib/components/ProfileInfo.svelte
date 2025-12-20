<script lang="ts">
	import Tooltip from './Tooltip.svelte';
	import ProfileSettingsPopup from './ProfileSettingsPopup.svelte';
	import StreakNotification from './StreakNotification.svelte';

	let {
		user,
		totalHours,
		projectCount,
		coins,
		stellarships,
		paintchips,
		devlogStreak = 0,
		onLogout,
		onUserUpdate = () => {} // Callback to notify parent when user data changes
	} = $props();

	let showLogoutButton = $state(false);
	let showSettingsButton = $state(false);
	let showSettingsPopup = $state(false);

	// Function to get missing profile information
	function getMissingProfileInfo(user: any) {
		if (!user) return [];

		const missing = [];

		if (!user?.githubUsername || !user.githubUsername.trim()) {
			missing.push('GitHub username');
		}

		// Check new required profile fields
		if (!user?.howDidYouHear || !user.howDidYouHear.trim()) {
			missing.push('How did you hear about this?');
		}

		if (!user?.doingWell || !user.doingWell.trim()) {
			missing.push('What are we doing well?');
		}

		if (!user?.improve || !user.improve.trim()) {
			missing.push('How can we improve?');
		}

		// Check Hack Club Auth - required for shipping projects
		if (!user?.hackclub_id || !user.hackclub_id.trim()) {
			missing.push('Hack Club verification');
		}

		return missing;
	}

	// Function to get tooltip text for missing information
	function getProfileWarningTooltip(user: any) {
		if (!user) return '';

		const missing = getMissingProfileInfo(user);

		if (missing.length === 0) {
			return '';
		}

		if (missing.length === 1) {
			return `Missing: ${missing[0]}`;
		}

		return `Missing: ${missing.join(', ')}`;
	}
</script>

<div
	class="zlayer profile-info"
	role="button"
	tabindex="0"
	onmouseenter={() => {
		showLogoutButton = true;
		showSettingsButton = true;
	}}
	onmouseleave={() => {
		showLogoutButton = false;
		showSettingsButton = false;
	}}
>
	<img
		src="https://assets.hackclub.com/flag-orpheus-left.svg"
		style="width: 100px; position: absolute; top: 5px; left: 0;"
		alt="Hack Club flag"
	/>

	<div class="profile-box">
		<img src="/pfp_placeholder.png" alt="Profile" />

		<div class="profile-text">
			<p class="hourinfo">{Number(totalHours).toFixed(2)} hours · {projectCount} projects</p>
			<div
				class="username-container"
				aria-roledescription="User profile"
				onclick={() => (window.location.href = `/u/${user?.username}`)}
			>
				<p class="username">{user?.username || 'Loading...'}</p>
				{#if devlogStreak > 0}
					<Tooltip
						text={`devlog streak: ${devlogStreak} day${devlogStreak !== 1 ? 's' : ''} - post a devlog every day to keep it going!`}
					>
						<StreakNotification streak={devlogStreak} />
					</Tooltip>
				{/if}
				{#if user && getMissingProfileInfo(user).length > 0}
					<Tooltip text={getProfileWarningTooltip(user)}>
						<div class="profile-badge">!</div>
					</Tooltip>
				{/if}
			</div>
			<div class="coins-info">
				<p>{coins || 0}</p>
				<Tooltip text="earn coins by submitting projects. use them to buy items in the shop!">
					<img src="/coin.png" alt="Coins" />
				</Tooltip>
				<p>·</p>
				<p>{stellarships || 0}</p>
				<Tooltip
					text="earn stellar ships by submitting projects to the black hole after you polish them. use them for special items in the shop!"
				>
					<img src="/stellarship.png" alt="Stellar ships" />
				</Tooltip>
				<p>·</p>
				<p>{paintchips || 0}</p>
				<Tooltip
					text="earn 5 paint chips per hour on shipped projects. use them to decorate your room!"
				>
					<img src="/paintchip.png" alt="Paint chips" />
				</Tooltip>
			</div>
		</div>

		<button
			class="settings-button"
			onclick={() => (showSettingsPopup = true)}
			class:visible={showSettingsButton}
		>
			profile settings
			{#if user && getMissingProfileInfo(user).length > 0}
				<div class="settings-badge">!</div>
			{/if}
		</button>

		<button class="logout-button" onclick={onLogout} class:visible={showLogoutButton}>
			log out
		</button>
	</div>
</div>

{#if user}
	<ProfileSettingsPopup
		showPopup={showSettingsPopup}
		onClose={() => (showSettingsPopup = false)}
		{user}
		{onUserUpdate}
	/>
{/if}

<style>
	.zlayer {
		position: absolute;
		top: 0;
		left: 0;
	}

	.profile-info {
		z-index: 2;
		position: relative;
	}

	.coins-info {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 4px;
	}

	.coins-info img {
		height: 1em;
		filter: drop-shadow(-1.5px -1.5px 0 white) drop-shadow(1.5px -1.5px 0 white)
			drop-shadow(-1.5px 1.5px 0 white) drop-shadow(1.5px 1.5px 0 white) drop-shadow(0 0 3px white);
	}

	.profile-box {
		position: absolute;
		background-color: #fbf2bf;
		border: 4px solid #f7c881;
		padding: 8px;
		border-radius: 8px;
		display: flex;
		box-sizing: border-box;
		height: 6em;
		width: auto;
		top: 50px;
		left: 30px;
		transition: height 0.2s ease;
	}

	.username-container {
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.profile-badge {
		background: #ff6b6b;
		color: white;
		border-radius: 50%;
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		font-weight: bold;
		animation: pulse-badge 2s infinite;
		cursor: help;
		border: 1px solid white;
	}

	.settings-badge {
		position: absolute;
		top: -4px;
		right: -4px;
		background: #ff6b6b;
		color: white;
		border-radius: 50%;
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		font-weight: bold;
		animation: pulse-badge 2s infinite;
		cursor: help;
		border: 1px solid white;
	}

	@keyframes pulse-badge {
		0%,
		100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.1);
			opacity: 0.8;
		}
	}

	.profile-info:hover .profile-box {
		height: 10.5em;
	}

	.profile-box > img {
		height: calc(6em - 24px);
		border-radius: 2px;
	}

	.profile-text {
		padding: 0 12px;
		display: flex;
		flex-flow: column;
		justify-content: center;
		height: calc(6em - 24px);
		box-sizing: border-box;
	}

	.profile-text p {
		margin: 0;
	}

	.logout-button {
		font-family: inherit;
		font-size: inherit;
		position: absolute;
		bottom: 8px;
		left: 8px;
		right: 8px;
		background-color: #f7c881;
		border: none;
		border-radius: 8px;
		padding: 8px 16px;
		font-size: 14px;
		color: #333;
		cursor: pointer;
		transition:
			background-color 0.2s,
			color 0.2s;
		z-index: 20;
		text-align: center;
		opacity: 0;
		transition: 0.2s;
	}

	.logout-button.visible {
		opacity: 1;
	}

	.logout-button:hover {
		background-color: white;
		color: black;
	}

	.profile-button {
		font-family: inherit;
		font-size: inherit;
		position: absolute;
		bottom: 8px;
		left: 8px;
		right: 8px;
		background-color: #f7c881;
		border: none;
		border-radius: 8px;
		padding: 8px 16px;
		font-size: 14px;
		color: #333;
		cursor: pointer;
		transition:
			background-color 0.2s,
			color 0.2s;
		z-index: 20;
		text-align: center;
		opacity: 0;
		transition: 0.2s;
	}

	.settings-button {
		font-family: inherit;
		font-size: inherit;
		position: absolute;
		bottom: 48px;
		left: 8px;
		right: 8px;
		background-color: #f7c881;
		border: none;
		border-radius: 8px;
		padding: 8px 16px;
		font-size: 14px;
		color: #333;
		cursor: pointer;
		transition:
			background-color 0.2s,
			color 0.2s,
			opacity 0.2s;
		z-index: 20;
		text-align: center;
		opacity: 0;
	}

	.settings-button.visible {
		opacity: 1;
	}

	.settings-button:hover {
		background-color: white;
		color: black;
	}

	p.hourinfo {
		opacity: 50%;
		font-size: 0.8em;
	}

	p.username {
		font-size: 1.2em;
	}
</style>
