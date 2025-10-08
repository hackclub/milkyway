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
	let expandedFaqItem = $state(null);

	// FAQ data
	const faqData = [
		{
			question: "What is Milkyway?",
			answer: "Milkyway is a centralized shop for gamedev projects — and you can also build a little digital house! Make games to earn coins and spend in the shop to buy cool prizes."
		},
		{
			question: "What is Overglade?",
			answer: "Overglade is a game jam that is happening in Singapore, December 15-19. You can purchase a ticket to Overglade in the Milkyway shop (which includes all accommodation and food), and you can also purchase additional flight stipends. For more information, visit the Overglade website!"
		},
		{
			question: "Am I eligible to participate?",
			answer: "You are eligible to participate in Milkyway and Overglade if you are 18 years old or younger. You will need to verify your identity before being able to purchase items in the shop."
		},
		{
			question: "How much does it cost?",
			answer: "Milkyway is completely free to participate in!"
		},
		{
			question: "How do I earn coins in Milkyway?",
			answer: "Earn coins by submitting your game projects. The number of coins that you receive from each project is dependent on the number of hours and effort spent building it — after submission, you will get feedback on your project, and you can earn even more coins by working on the feedback recieved."
		},
		{
			question: "Who is running this?",
			answer: "Milkyway is a part of Hack Club, a 501(c)(3) nonprofit organization. Milkyway is mainly run by Tongyu!"
		},
		{
			question: "Can I still participate if I'm a beginner?",
			answer: "Absolutely! Feel free to ask questions in the #milkyway Slack channel, and we'll do our best to help. The various challenges in Milkyway are also designed to challenge you and improve your gamedev skills."
		}
	];

	// Function to toggle FAQ item expansion
	function toggleFaqItem(index) {
		expandedFaqItem = expandedFaqItem === index ? null : index;
	}

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

<svelte:head>
	<title>Milkyway</title>
</svelte:head>

<main>
	<img class="logo-bg" src="milkyway.png" />

	<div class="login-inputs">
		{#if data.user}
			<p style="color: white;">you're already logged in!</p>
			<LinkButton href="/home" showarrow>enter the milkyway</LinkButton>
		{:else if !sendOTPPromise}
			<p style="color: white;">join the milkyway — your digital gamedev house.</p>
			<ShortTextInput
				bind:value={email}
				placeholder="enter email to begin"
				onclick={() => (sendOTPPromise = sendOTP())}
				>send otp
			</ShortTextInput>
		{:else}
			{#await sendOTPPromise}
				<p style="color: white;">sending...</p>
			{:then response_answer}
				{#if !checkOTPPromise}
					<p style="color: white;">otp sent — check your inbox!</p>

					<ShortTextInput
						bind:value={otp}
						placeholder="input otp (check email!)"
						onclick={() => (checkOTPPromise = checkOTP())}
						>submit otp
					</ShortTextInput>
				{:else}
					{#await checkOTPPromise}
						<p style="color: white;">verifying...</p>
					{:then response_answer}
						<p style="color: white;">you're in!</p>
					{:catch error}
						<ShortTextInput
							bind:value={otp}
							placeholder="input otp (check email!)"
							onclick={() => (checkOTPPromise = checkOTP())}
							>submit otp
						</ShortTextInput>

						<p style="color: white;">checking error occured: {error}</p>
					{/await}
				{/if}
			{:catch error}
				<ShortTextInput
					bind:value={email}
					placeholder="enter email to begin"
					onclick={() => (sendOTPPromise = sendOTP())}
					>send otp
				</ShortTextInput>

				<p style="color: white;">sending otp error occured: {error}</p>
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
			<p style="color: white;">hey ur game so cool!</p>
			<p style="color: white;">~ anonymous</p>
		</div>

		<img
			src="landing/cat.png"
			class="room-cat"
			onmouseenter={() => (showCatInfo = true)}
			onmouseleave={() => (showCatInfo = false)}
		/>

		<div class="room-cat-info" class:visible={showCatInfo}>
			<p style="color: white;">insert image</p>
			<p style="color: white;">fun little game</p>
			<p style="color: white;">for xx · xx hours spent</p>
		</div>

		<img src="landing/makegames.png" class="room-makegames" />
		<p class="room-text room-makegames">make games</p>
		<img src="landing/buildhouses.png" class="room-buildhouses" />
		<p class="room-text room-buildhouses">build houses</p>
		<img src="landing/getprizes.png" class="room-getprizes" />
		<p class="room-text room-getprizes">get prizes</p>
	</div>

	<div class="prizes-row">
		
		<img src="prizes/nyt.png" alt="New York Times prize" class="prize-image" />
		<img src="prizes/switch.png" alt="Nintendo Switch prize" class="prize-image" />
		<img src="prizes/stickers_filled.png" alt="Stickers filled prize" class="prize-image" />
		<img src="prizes/fangamer.png" alt="Fangamer prize" class="prize-image" />
		
	</div>

	<div class="faq-section">
		<h3>Have questions? We answer them!!!</h3>
		<div class="faq-list">
			{#each faqData as item, index}
				<div class="faq-item">
					<button 
						class="faq-question" 
						onclick={() => toggleFaqItem(index)}
					>
						<span>{item.question}</span>
						<span class="faq-arrow" class:expanded={expandedFaqItem === index}>▼</span>
					</button>
					
					{#if expandedFaqItem === index}
						<div class="faq-answer">
							<p>{item.answer}</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>
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

	.prizes-row {
		display: flex;
		align-items: space-between;
		margin-top: 40px;
		max-width: 100vw;
		box-sizing: border-box;
		margin-left: calc(-50vw + 50%);
		overflow-x: hidden;
		padding-top: 15px;
		padding-bottom: 15px;
	}

	.prize-image {
		height: 22vw;
		width: auto;
		object-fit: contain;
		margin-left: -5vw;
		flex: 1;
		animation: bounce 2s ease-in-out infinite;
	}

	.prize-image:first-child {
		margin-left: 0;
		animation-delay: 0s;
	}

	.prize-image:nth-child(2) {
		animation-delay: 0.2s;
	}

	.prize-image:nth-child(3) {
		animation-delay: 0.4s;
	}

	.prize-image:nth-child(4) {
		animation-delay: 0.6s;
	}

	.prize-image:nth-child(5) {
		animation-delay: 0.8s;
	}

	@keyframes bounce {
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-10px);
		}
	}

	.faq-section {
		background-color: #FBF2BF;
		border: 4px solid #F7C881;
		border-radius: 8px;
		margin: 40px 20px;
		padding: 32px;
		text-align: center;
	}

	.faq-section h3 {
		margin: 0 0 24px 0;
		color: #2c3e50;
		font-size: 24px;
		font-weight: 700;
		letter-spacing: -0.5px;
	}

	.faq-list {
		text-align: left;
		max-width: 600px;
		margin: 0 auto;
	}

	.faq-item {
		border-bottom: 1px solid rgba(247, 200, 129, 0.3);
		margin-bottom: 0;
	}

	.faq-item:last-child {
		border-bottom: none;
	}

	.faq-question {
		width: 100%;
		background: none;
		border: none;
		padding: 20px 16px;
		text-align: left;
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: #2c3e50;
		font-size: 1em;
		font-family: inherit;
		font-weight: 600;
		line-height: 1.4;
	}

	.faq-question:hover {
		color: #1a252f;
	}

	.faq-arrow {
		transition: transform 0.2s;
		font-size: 14px;
		color: #7f8c8d;
		margin-left: 12px;
		flex-shrink: 0;
	}

	.faq-arrow.expanded {
		transform: rotate(180deg);
	}

	.faq-answer {
		padding: 0 16px 20px 16px;
		color: #34495e;
		line-height: 1.6;
		font-size: 1em;
		font-family: inherit;
	}

	.faq-answer p {
		margin: 0;
		font-weight: 400;
	}
</style>
