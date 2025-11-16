<script>
	let { streak = 0, animate = false } = $props();

	let shouldAnimate = $state(false);

	$effect(() => {
		if (animate && streak > 0) {
			shouldAnimate = true;
			setTimeout(() => {
				shouldAnimate = false;
			}, 600);
		}
	});
</script>

<div class="streak-badge" class:animate={shouldAnimate}>
	{streak}
</div>

<style>
	.streak-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 4px;
		background: #ff8a5f;
		color: white;
		font-size: 10px;
		font-weight: bold;
		border-radius: 9px;
		cursor: help;
		flex-shrink: 0;
		border: 2px solid #fff;
		vertical-align: middle;
		margin-top: -2px;
	}

	.streak-badge.animate {
		animation: streak-pulse 0.6s ease;
	}

	@keyframes streak-pulse {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.15);
		}
		100% {
			transform: scale(1);
		}
	}
</style>
