<script lang="ts">
	import { onMount } from 'svelte';
	import Quests from '$lib/components/furniture/tamagotchi/Quests.svelte';
	import ExpandableButton from '$lib/components/ExpandableButton.svelte';
	import LinkButton from '$lib/components/LinkButton.svelte';

	const { data } = $props();
	let maxPercentage = 10;

	onMount(() => {
		const resizeTree = () => {
			const main = document.querySelector('main') as HTMLElement;
			const h1 = document.querySelector('h1') as HTMLElement;
			const tree = document.querySelector('.tree') as HTMLElement;
			const star = document.querySelector('.star') as HTMLElement;

			if (!main || !h1 || !tree) return;

			const mainHeight = main.clientHeight;
			const h1Height = h1.offsetHeight;
			const padding = 40;
			const gap = 10;

			const availableHeight = mainHeight - h1Height - padding - gap - 80;
			const finalHeight = Math.max(availableHeight, 150);

			tree.style.height = finalHeight + 'px';
			tree.style.maxHeight = finalHeight + 'px';

			if (star) {
				const starHeight = finalHeight * 0.15;
				star.style.height = starHeight + 'px';
				star.style.width = 'auto';
				star.style.maxHeight = starHeight + 'px';
			}
		};

		setTimeout(resizeTree, 100);
		window.addEventListener('resize', resizeTree);

		let currentFill = 0;
		const fillInterval = setInterval(() => {
			if (currentFill < maxPercentage) {
				currentFill += 2;
				const star = document.querySelector('.star') as HTMLElement;
				if (star) {
					star.style.setProperty('--fill-percentage', `${currentFill}%`);
				}
			} else {
				clearInterval(fillInterval);
			}
		}, 60);

		return () => {
			window.removeEventListener('resize', resizeTree);
			clearInterval(fillInterval);
		};
	});
</script>

<svelte:head>
	<title>Christmas Tree! ✦ Milkyway</title>
</svelte:head>
<main>
	<div class="content">
		<h1
			style="color: white; text-align: center; font-size: 3rem; text-shadow: 2px 2px 4px #000000;"
		>
			Merry Christmas!
		</h1>
		<div class="grid">
			<div class="tree">
				<img src="/room/christmas/topstar.png" class="star" alt="top star" />
				<img
					src="/room/christmas_tree.png"
					class="tree-image"
					width="500"
					height="700"
					draggable="false"
					alt="christmas tree"
				/>
			</div>
			<div class="actions">
				<Quests />
				<button>Decorate! (1 left)</button>
			</div>
		</div>
	</div>
	<div class="back-button-container">
		<a href={data.isLoggedIn ? '/home' : '/'} class="back-button">
			<span>← back to {data.isLoggedIn ? 'home' : 'landing'}</span>
		</a>
	</div>
</main>

<style>
	main {
		background-image: url('/milkyway bg.png');
		background-size: cover;
		background-position: center;
		height: 100%;
		width: 100%;
		box-sizing: border-box;
		position: absolute;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		padding: 20px;
	}
	button {
		border: 4px solid var(--orange);
		background-color: var(--yellow);
		padding: 8px 16px;
		border-radius: 100px;
		color: black;
		text-decoration: none;
		transition: 0.2s;
	}
	button:hover {
		background-color: var(--orange);
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr 0.6fr;
		grid-template-rows: 1fr;
		grid-column-gap: 0;
		grid-row-gap: 0;
	}
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		width: 100%;
	}
	.content h1 {
		font-size: clamp(1.5rem, 5vw, 3rem);
		margin: 0;
		flex-shrink: 0;
	}
	.actions {
		color: white;
		font-size: 1.2rem;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 20px;
	}

	.tree-container {
		display: grid;
		grid-template-columns: 0.3fr 1fr;
		grid-template-rows: 1fr;
		grid-column-gap: 0;
		grid-row-gap: 0;
	}
	.tree {
		position: relative;
		/* responsive width: at most 500px, but shrink to fit small screens */
		width: min(90vw, 500px);
		/* move the whole tree (and absolute star) down a bit in a responsive way */
		margin: clamp(12px, 6vh, 80px) auto 0 auto;
		overflow: visible;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.tree img {
		display: block;
		max-width: 100%;
		max-height: 100%;
		height: auto;
		width: auto;
		object-fit: contain;
	}

	/* star sits absolutely above the tree */
	.tree img.star {
		position: absolute;
		top: -7%;
		left: 52%;
		transform: translateX(-50%);
		z-index: 2;
		pointer-events: none;
		width: auto;
		height: auto;
		max-width: 100%;
		max-height: 100%;
		--fill-percentage: 0%;

		-webkit-mask-image: linear-gradient(
			to top,
			black 0%,
			black var(--fill-percentage),
			rgba(0, 0, 0, 0.3) var(--fill-percentage),
			rgba(0, 0, 0, 0.3) 100%
		);
		mask-image: linear-gradient(
			to top,
			black 0%,
			black var(--fill-percentage),
			rgba(0, 0, 0, 0.3) var(--fill-percentage),
			rgba(0, 0, 0, 0.3) 100%
		);
	}

	.tree img.tree-image {
		position: relative;
		z-index: 1;
	}

	@media (max-width: 360px) {
		.tree img.star {
			top: -10%;
		}
	}

	.back-button-container {
		position: fixed;
		bottom: 0;
		left: 0;
		padding: 30px;
		z-index: 10;
		pointer-events: none;
	}

	.back-button {
		pointer-events: auto;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		text-align: center;
		gap: 4px;
		border: 2px solid white;
		padding: 12px 20px;
		width: auto;
		height: auto;
		box-sizing: border-box;
		border-radius: 8px;
		background-color: #ffffff25;
		color: white;
		text-decoration: none;
		transition: 0.2s;
		cursor: pointer;
		font-family: inherit;
		font-size: inherit;
	}

	.back-button:hover {
		background-color: white;
		color: black;
	}
</style>
