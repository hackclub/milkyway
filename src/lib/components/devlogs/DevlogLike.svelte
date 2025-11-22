<script>
	/**
	 * @typedef {Object} Like
	 * @property {string} userId
	 * @property {string} username
	 * @property {string} created
	 */

	let { devlogId, likes = [], currentUser } = $props();

	let isLiking = $state(false);
	let localLikes = $state([...likes]);

	const likeCount = $derived(localLikes.length);
	const isLiked = $derived(
		currentUser ? localLikes.some((like) => like.userId === currentUser.recId) : false
	);

	async function toggleLike() {
		if (!currentUser) {
			return;
		}

		if (isLiking) return;

		isLiking = true;

		const wasLiked = isLiked;
		if (wasLiked) {
			localLikes = localLikes.filter((like) => like.userId !== currentUser.recId);
		} else {
			localLikes = [
				...localLikes,
				{
					userId: currentUser.recId,
					username: currentUser.username,
					created: new Date().toISOString()
				}
			];
		}

		try {
			const response = await fetch('/api/devlog-like', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					devlogId: devlogId
				})
			});

			const result = await response.json();

			if (result.success) {
				if (result.isLiked) {
					if (!localLikes.some((like) => like.userId === currentUser.recId)) {
						localLikes = [
							...localLikes,
							{
								userId: currentUser.recId,
								username: currentUser.username,
								created: new Date().toISOString()
							}
						];
					}
				} else {
					localLikes = localLikes.filter((like) => like.userId !== currentUser.recId);
				}
			} else {
				if (wasLiked) {
					localLikes = [
						...localLikes,
						{
							userId: currentUser.recId,
							username: currentUser.username,
							created: new Date().toISOString()
						}
					];
				} else {
					localLikes = localLikes.filter((like) => like.userId !== currentUser.recId);
				}
			}
		} catch (error) {
			console.error('Error toggling like:', error);
			if (wasLiked) {
				localLikes = [
					...localLikes,
					{
						userId: currentUser.recId,
						username: currentUser.username,
						created: new Date().toISOString()
					}
				];
			} else {
				localLikes = localLikes.filter((like) => like.userId !== currentUser.recId);
			}
		} finally {
			isLiking = false;
		}
	}
</script>

<button
	class="like-button"
	class:liked={isLiked}
	class:disabled={!currentUser}
	onclick={toggleLike}
	disabled={isLiking}
	title={currentUser ? (isLiked ? 'unlike' : 'like') : 'Log in to like'}
>
	<svg
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill={isLiked ? 'currentColor' : 'none'}
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<path
			d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
		/>
	</svg>
	{#if likeCount > 0}
		<span>{likeCount}</span>
	{/if}
</button>

<style>
	.like-button {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		background: transparent;
		border: none;
		border-radius: 14px;
		cursor: pointer;
		color: #536471;
		font-size: 13px;
		font-weight: 600;
		transition: all 0.2s ease;
		font-family: inherit;
	}

	.like-button:hover:not(.disabled) {
		background: rgba(249, 24, 128, 0.1);
		color: #f91880;
	}

	.like-button.liked {
		color: #f91880;
	}

	.like-button.liked:hover {
		background: rgba(249, 24, 128, 0.1);
		color: #d01060;
	}

	.like-button.disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.like-button:disabled {
		opacity: 0.8;
	}

	.like-button svg {
		width: 16px;
		height: 16px;
	}
</style>
