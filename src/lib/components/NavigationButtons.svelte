<script>
	let { onOpenFaq } = $props();
</script>

<!-- Bottom navigation buttons -->
<div class="zlayer bottom-buttons">
	<div class="bottom-left-buttons">
		<a href="/friends" class="bottom-button">
			<img src="/explore.png" alt="Explore" />
			<span>explore</span>
		</a>
		<div class="crew-container">
			<a class="bottom-button crew-button disabled">
				<img src="/friends.png" alt="Crew" />
				<span>crew</span>
			</a>
			<div class="crew-popup">coming soon!</div>
		</div>
	</div>
	<div class="bottom-right-buttons">
		<a href="/devlogs" class="bottom-button">
			<img src="/mimiphone.png" alt="Devlogs" />
			<span>devlogs</span>
		</a>
		<a href="/leaderboard" class="bottom-button">
			<img src="/leaderboard.png" alt="Shop" />
			<span class="leaderboard">leaderboard</span>
		</a>

		<a href="/shop" class="bottom-button">
			<img src="/shop.png" alt="Shop" />
			<span>shop</span>
		</a>
	</div>
</div>

<!-- FAQ button -->
<div class="zlayer faq-button">
	<button class="faq-icon" onclick={onOpenFaq} aria-label="Open FAQ">
		<img src="/mimi_faq.png" alt="FAQ" />
	</button>
</div>

<!-- Tutorials button -->
<div class="zlayer tutorials-button">
	<a
		href="https://hcmilkyway.notion.site"
		target="_blank"
		rel="noopener noreferrer"
		class="tutorials-icon"
		aria-label="Open Tutorials"
	>
		<img src="/mimi_tutorials.png" alt="Tutorials" />
	</a>
</div>

<style>
	.zlayer {
		position: absolute;
		top: 0;
		left: 0;
	}

	.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.bottom-button.disabled:hover {
		background-color: #ffffff25;
		color: white;
	}

	.bottom-buttons {
		z-index: 2;
		bottom: 0;
		width: 100%;
		top: auto;
		display: flex;
		flex-flow: row;
		justify-content: space-between;
		align-items: flex-end;
		padding: 30px;
		pointer-events: none;
	}

	.bottom-buttons a {
		padding: 18px;
		font-size: inherit;
		font-family: inherit;
	}

	.bottom-button {
		pointer-events: auto;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		text-align: center;
		gap: 4px;
		border: 2px solid white;
		aspect-ratio: 1;
		padding: 1000px;
		width: auto;
		height: 6em;
		box-sizing: border-box;
		border-radius: 8px;
		background-color: #ffffff25;
		color: white;
		text-decoration: none;
		transition: 0.2s;
		cursor: pointer;
	}

	.bottom-right-buttons {
		display: flex;
		flex-direction: row;
		gap: 20px;
	}

	.bottom-left-buttons {
		display: flex;
		flex-direction: column-reverse;
		gap: 20px;
	}

	.crew-container {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.crew-popup {
		position: absolute;
		bottom: 110%;
		left: 50%;
		transform: translateX(-50%);
		background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%);
		color: white;
		padding: 12px 20px;
		border-radius: 20px;
		font-size: 0.9em;
		font-weight: 600;
		white-space: nowrap;
		box-shadow:
			0 8px 25px rgba(0, 0, 0, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.2);
		pointer-events: none;
		letter-spacing: 0.5px;
		border: 1px solid rgba(255, 255, 255, 0.3);
		animation: floatPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}

	.crew-popup::after {
		content: '';
		position: absolute;
		bottom: -8px;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-left: 8px solid transparent;
		border-right: 8px solid transparent;
		border-top: 8px solid #c44569;
	}

	.crew-button:hover .crew-popup {
		animation: float 2s ease-in-out infinite;
	}

	@keyframes floatPop {
		0% {
			opacity: 0;
			transform: translateX(-50%) translateY(20px) scale(0.8);
		}
		100% {
			opacity: 1;
			transform: translateX(-50%) translateY(0) scale(1);
		}
	}

	@keyframes float {
		0%,
		100% {
			transform: translateX(-50%) translateY(0px);
		}
		50% {
			transform: translateX(-50%) translateY(-8px);
		}
	}

	.bottom-button img {
		height: 80%;
	}

	.bottom-button span {
		margin: 0;
		padding: 0;
		color: inherit;
	}

	.bottom-button:hover {
		background-color: white;
		color: black;
	}

	.leaderboard {
		font-size: 0.8em;
	}

	.faq-button {
		z-index: 2;
		bottom: 0;
		left: 200px;
		top: auto;
	}

	.faq-icon {
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
		display: block;
		line-height: 0;
		position: relative;
	}

	.faq-icon img {
		width: auto;
		height: 100px;
		display: block;
	}

	.faq-icon:hover img {
		opacity: 0;
	}

	.faq-icon::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 110%;
		background-image: url('/mimi_faq_hover.png');
		background-size: contain;
		background-repeat: no-repeat;
		background-position: bottom;
		opacity: 0;
		pointer-events: none;
	}

	.faq-icon:hover::after {
		opacity: 1;
	}

	.tutorials-button {
		z-index: 2;
		bottom: -5px;
		left: 350px;
		top: auto;
	}

	.tutorials-button:hover {
		bottom: 0;
	}

	.tutorials-icon {
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
		display: block;
		line-height: 0;
		position: relative;
	}

	.tutorials-icon img {
		width: auto;
		height: 100px;
		display: block;
	}
</style>
