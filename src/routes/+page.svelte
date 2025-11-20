<script>
	// import { redirect } from '@sveltejs/kit';

	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	import LinkButton from '$lib/components/LinkButton.svelte';
	import ShortTextInput from '$lib/components/ShortTextInput.svelte';

	let { data } = $props();

	let sendOTPPromise = $state(/** @type {Promise<any> | null} */ (null));
	let checkOTPPromise = $state(null);
	let email = $state('');
	let otp = $state('');
	let showCatInfo = $state(false);
	let showStickynoteInfo = $state(false);
	let expandedFaqItem = $state(/** @type {number | null} */ (null));

	// Intro sequence state
	let introStage = $state('none'); // 'none', 'black-screen', 'video', 'fade-out', 'complete'
	let isDesktop = $state(false);
	let videoElement = $state(/** @type {HTMLVideoElement | null} */ (null));

	onMount(() => {
		// Check if desktop (width > 768px)
		isDesktop = window.innerWidth > 768;
		
		// Check if user has seen intro before
		const hasSeenIntro = localStorage.getItem('milkyway_intro_seen');
		
		if (isDesktop && !hasSeenIntro) {
			introStage = 'black-screen';
		} else {
			introStage = 'complete';
		}

		// Parse referral parameter from URL
		const urlParams = new URLSearchParams($page.url.search);
		const referrerUsername = urlParams.get('from');
		if (referrerUsername) {
			// Store referrer in localStorage to persist through the signup flow
			localStorage.setItem('milkyway_referrer', referrerUsername);
		}
		
		// Parse utm_source parameter from URL
		const utmSource = urlParams.get('utm_source');
		if (utmSource) {
			// Store utm_source in localStorage to persist through the signup flow
			localStorage.setItem('milkyway_utm_source', utmSource);
		}
	});

	function handleBlackScreenClick() {
		if (introStage === 'black-screen') {
			// Mark as seen when user clicks to start video
			localStorage.setItem('milkyway_intro_seen', 'true');
			introStage = 'video';
			// Wait a bit for fade, then play video
			setTimeout(() => {
				if (videoElement) {
					videoElement.play();
				}
			}, 300);
		}
	}

	function handleVideoEnd() {
		introStage = 'fade-out';
		// After fade completes, show main content
		setTimeout(() => {
			introStage = 'complete';
		}, 1000);
	}

	function replayIntro() {
		localStorage.removeItem('milkyway_intro_seen');
		introStage = 'black-screen';
	}

	function skipIntro() {
		localStorage.setItem('milkyway_intro_seen', 'true');
		introStage = 'complete';
	}

	// FAQ data
	const faqData = [
		{
			question: "What is Milkyway?",
			answer: "Milkyway is a centralized shop for gamedev projects — and you can also build a little digital house! Make games to earn coins and spend in the shop to buy cool prizes."
		},
		{
			question: "What is Overglade?",
			answer: "Overglade is a game jam in a game that is happening in Singapore in January. You can purchase a ticket to Overglade in the Milkyway shop (which includes all accommodation and food), and you can also purchase additional flight stipends. For more information, visit the Overglade website at overglade.hackclub.com!"
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
	/**
	 * @param {number} index
	 */
	function toggleFaqItem(index) {
		expandedFaqItem = expandedFaqItem === index ? null : index;
	}

	async function sendOTP() {
		return new Promise((fulfil, reject) => {
			// Get referrer from localStorage if available
			const referrerUsername = localStorage.getItem('milkyway_referrer');
			
			// Get utm_source from localStorage if available
			const utmSource = localStorage.getItem('milkyway_utm_source');
			
			fetch('/api/send-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					email,
					referrer: referrerUsername, // Include referrer in the request
					utm_source: utmSource // Include utm_source in the request
				})
			})
				.then((res) => res.json())
				.then((data) => {
					if (data.success) {
						// Clear referrer and utm_source from localStorage after successful OTP send
						localStorage.removeItem('milkyway_referrer');
						localStorage.removeItem('milkyway_utm_source');
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
	<meta property="og:title" content="Milkyway" />
	<meta property="og:description" content="Make games, build houses, get amazing rewards like a trip to Singapore!" />
	<meta property="og:image" content="/ogimg.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Milkyway" />
	<meta name="twitter:description" content="Make games, build houses, get amazing rewards like a trip to Singapore!" />

	<meta name="theme-color" content="#73ACE0" />
</svelte:head>

<!-- Intro Sequence -->
{#if introStage !== 'complete'}
	<!-- Black screen with blinking text -->
	{#if introStage === 'black-screen'}
		<div 
			class="intro-overlay black-screen" 
			onclick={handleBlackScreenClick}
			onkeydown={(e) => e.key === 'Enter' && handleBlackScreenClick()}
			role="button"
			tabindex="0"
		>
			<div class="blinking-text">milkyway?</div>
			<button class="skip-intro-button" onclick={(e) => { e.stopPropagation(); skipIntro(); }}>skip intro</button>
		</div>
	{/if}

	<!-- Video screen -->
	{#if introStage === 'video' || introStage === 'fade-out'}
		<div class="intro-overlay video-screen" class:fading-out={introStage === 'fade-out'}>
			<video
				bind:this={videoElement}
				src="/landing/intro.webm"
				class="intro-video"
				onended={handleVideoEnd}
				muted={false}
				playsinline
			></video>
			<button class="skip-intro-button" onclick={skipIntro}>skip intro</button>
		</div>
	{/if}
{/if}

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
				onkeydown={(e) => e.key === 'Enter' && (sendOTPPromise = sendOTP())}
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
						onkeydown={(e) => e.key === 'Enter' && (sendOTPPromise = sendOTP())}
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
							onkeydown={(e) => e.key === 'Enter' && (sendOTPPromise = sendOTP())}
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

		/>

		<div class="room-stickynote-info" class:visible={showStickynoteInfo}>
			<p style="color: white;">hey ur game so cool!</p>
			<p style="color: white;">~ anonymous</p>
		</div>

		<img
			src="landing/cat.png"
			class="room-cat"

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
		<img src="prizes/stickers_filled.png" alt="Stickers filled prize" class="prize-image" />
		
		<img src="prizes/overglade_ticket.png" alt="Tickets to Overglade" class="prize-image overglade" />
		
		<img src="prizes/fangamer.png" alt="Fangamer prize" class="prize-image" />
		<img src="prizes/switch.png" alt="Nintendo Switch prize" class="prize-image" />
		
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

	<footer>
		<p>made with ❤️ by tongyu</p>
		<p>with help from: cisco (intro animation audio), jay (additional programming), kai ling (overglade ticket art)</p>
		<p><button class="replay-intro-button" onclick={replayIntro}>wanna re-watch the intro?</button></p>
	</footer>
</main>

<style>

	footer {
		width: 100%;
		text-align: center;
		padding: 20px;
	}

	footer p {
		margin: 4px 0;
	}

	.replay-intro-button {
		background: none;
		border: none;
		color: inherit;
		font-family: inherit;
		font-size: inherit;
		text-decoration: underline;
		cursor: pointer;
		padding: 0;
	}

	.replay-intro-button:hover {
		opacity: 0.7;
	}

	/* Intro Overlay Styles */
	.intro-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: 9999;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.skip-intro-button {
		position: absolute;
		bottom: 20px;
		right: 20px;
		background: none;
		border: none;
		color: white;
		font-family: inherit;
		font-size: 0.9rem;
		cursor: pointer;
		padding: 8px 12px;
		opacity: 0.7;
		transition: opacity 0.2s;
		z-index: 10000;
	}

	.skip-intro-button:hover {
		opacity: 1;
	}

	.intro-overlay.black-screen {
		background-color: black;
		cursor: pointer;
	}

	.blinking-text {
		color: white;
		font-size: 1rem;
		font-weight: normal;
		animation: blink 1.2s infinite;
	}

	@keyframes blink {
		0%, 75% {
			opacity: 1;
		}
		76%, 100% {
			opacity: 0;
		}
	}

	.intro-overlay.video-screen {
		background-color: black;
	}

	.intro-overlay.video-screen.fading-out {
		animation: fadeOut 1s ease-out forwards;
	}

	.intro-video {
		width: 100vw;
		height: 100vh;
		object-fit: contain;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes fadeOut {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}

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
		justify-content: space-between;
		align-items: center;
		margin-top: 40px;
		max-width: 100vw;
		box-sizing: border-box;
		margin-left: calc(-50vw + 50%);
		overflow-x: hidden;
		padding-top: 15px;
		padding-bottom: 15px;
	}

	.prize-image {
		height: 15vw;
		width: auto;
		object-fit: contain;
		margin-left: -5vw;
		flex: 1;
		animation: bounce 2s ease-in-out infinite;
	}

	.prize-image.overglade {
		height: 23vw;
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
		color: #435B89;
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

	.login-inputs :global(button) {
    	cursor: pointer;
	}
</style>
