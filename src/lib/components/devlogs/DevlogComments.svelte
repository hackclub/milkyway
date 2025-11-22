<script>
	/**
	 * @typedef {Object} Comment
	 * @property {string} username
	 * @property {string} userId
	 * @property {string} content
	 * @property {string} created
	 */

	let { devlogId, comments = [], currentUser } = $props();

	let isExpanded = $state(false);
	let newComment = $state('');
	let isSubmitting = $state(false);
	let submitError = $state('');
	let localComments = $state([...comments]);

	const MAX_COMMENT_LENGTH = 500;
	const commentCount = $derived(localComments.length);
	const remainingChars = $derived(MAX_COMMENT_LENGTH - newComment.length);

	function formatDate(dateString) {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m`;
		if (diffHours < 24) return `${diffHours}h`;
		if (diffDays < 7) return `${diffDays}d`;

		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	}

	async function submitComment() {
		if (!currentUser) {
			submitError = 'Please log in to comment';
			return;
		}

		if (!newComment.trim()) {
			submitError = 'comment cannot be empty';
			return;
		}

		if (newComment.length > MAX_COMMENT_LENGTH) {
			submitError = `comment must be ${MAX_COMMENT_LENGTH} characters or less`;
			return;
		}

		isSubmitting = true;
		submitError = '';

		try {
			const response = await fetch('/api/devlog-comment', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					devlogId: devlogId,
					content: newComment.trim()
				})
			});

			const result = await response.json();

			if (result.success && result.comment) {
				// Add new comment to local list
				localComments = [...localComments, result.comment];
				newComment = '';
				submitError = '';
			} else {
				submitError = result.error || 'Failed to post comment';
			}
		} catch (error) {
			console.error('Error posting comment:', error);
			submitError = 'Failed to post comment. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	function handleKeydown(/** @type {KeyboardEvent} */ event) {
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			submitComment();
		}
	}
</script>

<div class="comments-section">
	<button class="comments-toggle" onclick={() => (isExpanded = !isExpanded)}>
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
			<path
				d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
		<span>{commentCount}</span>
	</button>

	{#if isExpanded}
		<div class="comments-expanded">
			{#if currentUser}
				<div class="comment-input-container">
					<textarea
						bind:value={newComment}
						onkeydown={handleKeydown}
						placeholder="write a comment..."
						maxlength={MAX_COMMENT_LENGTH}
						disabled={isSubmitting}
						class="comment-input"
					></textarea>
					<div class="comment-actions">
						<span class="char-count" class:warning={remainingChars < 50}>
							{remainingChars}
						</span>
						<button
							class="submit-comment-btn"
							onclick={submitComment}
							disabled={isSubmitting || !newComment.trim()}
						>
							{isSubmitting ? 'posting...' : 'post'}
						</button>
					</div>
					{#if submitError}
						<div class="error-message">{submitError}</div>
					{/if}
				</div>
			{:else}
				<div class="login-prompt">Log in to comment</div>
			{/if}

			<div class="comments-list">
				{#if localComments.length === 0}
					<div class="no-comments">no comments yet!</div>
				{:else}
					{#each localComments as comment (comment.created + comment.username)}
						<div class="comment">
							<div class="comment-header">
								<span class="comment-username">{comment.username}</span>
								<span class="comment-timestamp">{formatDate(comment.created)}</span>
							</div>
							<div class="comment-content">{comment.content}</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.comments-section {
		margin-top: 0;
		padding-top: 0;
	}

	.comments-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: transparent;
		border: none;
		border-radius: 16px;
		cursor: pointer;
		color: #536471;
		font-size: 13px;
		font-weight: 600;
		transition: all 0.2s ease;
		font-family: inherit;
	}

	.comments-toggle:hover {
		background: rgba(29, 155, 240, 0.1);
		color: #1d9bf0;
	}

	.comments-toggle svg {
		width: 16px;
		height: 16px;
	}

	.comments-expanded {
		margin-top: 8px;
		padding: 8px 0;
	}

	.comment-input-container {
		margin-bottom: 12px;
	}

	.comment-input {
		width: 100%;
		min-height: 60px;
		padding: 8px 12px;
		border: 1px solid #cfd9de;
		border-radius: 8px;
		font-size: 13px;
		font-family: inherit;
		resize: vertical;
		box-sizing: border-box;
		background: white;
		color: #0f1419;
	}

	.comment-input:focus {
		outline: none;
		border-color: #1d9bf0;
	}

	.comment-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.comment-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 6px;
	}

	.char-count {
		font-size: 12px;
		color: #536471;
	}

	.char-count.warning {
		color: #f91880;
		font-weight: 600;
	}

	.submit-comment-btn {
		padding: 6px 16px;
		background: #1d9bf0;
		color: white;
		border: none;
		border-radius: 16px;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.2s ease;
		font-family: inherit;
	}

	.submit-comment-btn:hover:not(:disabled) {
		background: #1a8cd8;
	}

	.submit-comment-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error-message {
		margin-top: 6px;
		color: #f91880;
		font-size: 12px;
	}

	.login-prompt {
		padding: 12px;
		text-align: center;
		color: #536471;
		font-size: 13px;
		background: rgba(29, 155, 240, 0.05);
		border-radius: 8px;
		margin-bottom: 12px;
	}

	.comments-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.no-comments {
		padding: 16px;
		text-align: center;
		color: #536471;
		font-size: 13px;
	}

	.comment {
		padding: 8px 0;
		border-bottom: 1px solid #eff3f4;
	}

	.comment:last-child {
		border-bottom: none;
	}

	.comment-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 4px;
	}

	.comment-username {
		font-size: 13px;
		font-weight: 700;
		color: #0f1419;
	}

	.comment-timestamp {
		font-size: 12px;
		color: #536471;
	}

	.comment-content {
		font-size: 13px;
		color: #0f1419;
		line-height: 1.4;
		white-space: pre-wrap;
		word-wrap: break-word;
	}
</style>
