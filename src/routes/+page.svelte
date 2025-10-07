<script>
	// import { redirect } from '@sveltejs/kit';

	import { goto } from '$app/navigation';

	import LinkButton from '$lib/components/LinkButton.svelte';
	import ShortTextInput from '$lib/components/ShortTextInput.svelte';

	let { data } = $props();
	console.log('data: ', data);

	let sendOTPPromise = $state(/** @type {Promise<any> | null} */ (null));
	let checkOTPPromise = $state(null);
	let email = $state('');
	let otp = $state('');
	let showCatInfo = $state(false);
	let showStickynoteInfo = $state(false);

	async function sendOTP() {
		return new Promise((fulfil, reject) => {
			fetch('/api/send-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			})
				.then((res) => res.json())
				.then((data) => {
					if (data.success) {
						fulfil(data);
						return;
					}
					reject(new Error(data.error?.message || JSON.stringify(data.error)));
				})
				.catch((err) => {
					reject(new Error(err.message || err.toString()));
				});
		});
	}

	async function checkOTP() {
		return new Promise((fulfil, reject) => {
			fetch('/api/verify-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, otp })
			})
				.then((res) => res.json())
				.then((data) => {
					if (data.success) {
						fulfil(data);
						goto('/home');
						return;
					}
					reject(new Error(data.error?.message || JSON.stringify(data.error)));
				})
				.catch((err) => {
					reject(new Error(err.message || err.toString()));
				});
		});
	}
</script>

<main>
	<img class="logo-bg" src="milkyway.png" />

	<div class="login-inputs">
		{#if data.user}
			<p>you're already logged in</p>
			<LinkButton href="/home" showarrow>enter the milkyway</LinkButton>
		{:else if !sendOTPPromise}
			<ShortTextInput
				bind:value={email}
				placeholder="enter email to begin"
				onclick={() => (sendOTPPromise = sendOTP())}
				>send otp
			</ShortTextInput>
		{:else}
			{#await sendOTPPromise}
				<p>sending...</p>
			{:then response_answer}
				{#if !checkOTPPromise}
					<p>otp sent, input otp</p>

					<ShortTextInput
						bind:value={otp}
						placeholder="input otp (check email!)"
						onclick={() => (checkOTPPromise = checkOTP())}
						>submit otp
					</ShortTextInput>
				{:else}
					{#await checkOTPPromise}
						<p>verifying...</p>
					{:then response_answer}
						<p>you're in!</p>
					{:catch error}
						<ShortTextInput
							bind:value={otp}
							placeholder="input otp (check email!)"
							onclick={() => (checkOTPPromise = checkOTP())}
							>submit otp
						</ShortTextInput>

						<p>checking error occured: {error}</p>
					{/await}
				{/if}
			{:catch error}
				<ShortTextInput
					bind:value={email}
					placeholder="enter email to begin"
					onclick={() => (sendOTPPromise = sendOTP())}
					>send otp
				</ShortTextInput>

				<p>sending otp error occured: {error}</p>
			{/await}
		{/if}
	</div>

	<div class="sample-room">
		<img src="landing/sample room.png" class="room-bg" />
		<img
			src="landing/stickynote.png"
			class="room-stickynote"
			onmouseenter={() => (showStickynoteInfo = true)}
			onmouseleave={() => (showStickynoteInfo = false)}
		/>

		<div class="room-stickynote-info" class:visible={showStickynoteInfo}>
			<p>hey ur game so cool!</p>
			<p>~ anonymous</p>
		</div>

		<img
			src="landing/cat.png"
			class="room-cat"
			onmouseenter={() => (showCatInfo = true)}
			onmouseleave={() => (showCatInfo = false)}
		/>

		<div class="room-cat-info" class:visible={showCatInfo}>
			<p>insert image</p>
			<p>fun little game</p>
			<p>for xx · xx hours spent</p>
		</div>

		<img src="landing/makegames.png" class="room-makegames" />
		<p class="room-text room-makegames">make games</p>
		<img src="landing/buildhouses.png" class="room-buildhouses" />
		<p class="room-text room-buildhouses">build houses</p>
		<img src="landing/getprizes.png" class="room-getprizes" />
		<p class="room-text room-getprizes">get prizes</p>
	</div>
</main>

<style>
	main {
		width: 100%;
		background-color: #74ade1;
		min-height: 100%;

		padding-bottom: 24px;
	}

	.logo-bg {
		width: 100%;
		margin-bottom: -45%;
	}

	.login-inputs {
		width: 100%;
		display: flex;
		flex-flow: column;
		justify-content: center;
		align-items: center;
		text-align: center;
	}

	.sample-room {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		margin-top: 80px;
		min-height: 50vw;
	}

	.sample-room img {
		position: absolute;
	}

	.sample-room .room-bg {
		width: 50vw;
		top: 0;
	}

	.sample-room .room-cat {
		width: 5vw;
		top: 70%;
		left: 52%;
	}

	.sample-room .room-stickynote {
		width: 5vw;
		top: 35%;
		left: 40%;
	}

	.room-cat,
	.room-stickynote {
		transition: filter 0.2s;
	}

	.room-cat:hover,
	.room-stickynote:hover {
		filter: drop-shadow(-1.5px -1.5px 0 var(--orange)) drop-shadow(1.5px -1.5px 0 var(--orange))
			drop-shadow(-1.5px 1.5px 0 var(--orange)) drop-shadow(1.5px 1.5px 0 var(--orange))
			drop-shadow(0 0 3px white);
	}

	.room-cat-info {
		position: absolute;
		display: none;

		background-color: white;

		top: 60%;
		left: 50%;
	}

	.room-cat-info p {
		margin: 0;
		font-size: 0.8em;
	}

	.room-cat-info.visible {
		display: block;
	}

	.room-stickynote-info {
		position: absolute;
		display: none;

		background-color: white;
		top: 29%;
		left: 38%;
	}

	.room-stickynote-info p {
		margin: 0;
		font-size: 0.8em;
	}

	.room-stickynote-info.visible {
		display: block;
	}

	.room-circle-info.makegames {
		position: absolute;
		top: 2%;
		left: 21%;
	}

	.room-makegames {
		height: 15vw;
		top: 5%;
		left: 16%;
	}

	.room-text {
		text-align: center;
		position: absolute;
		alignment-baseline: middle;
	}

	.room-text.room-makegames {
		transform: translateX(-50%) translateY(-50%);
		top: 19%;
		left: 30%;
	}

	.room-buildhouses {
		height: 15vw;
		top: 40%;
		left: 5%;
	}

	.room-text.room-buildhouses {
		transform: translateX(-50%) translateY(-50%);
		top: 55%;
		left: 12.5%;
	}

	.room-getprizes {
		height: 15vw;
		top: 72.5%;
		left: 20%;
	}

	.room-text.room-getprizes {
		transform: translateX(-50%) translateY(-50%);
		top: 86.5%;
		left: 26.5%;
	}
</style>
