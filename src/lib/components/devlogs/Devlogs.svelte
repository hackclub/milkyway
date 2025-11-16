<script>
	/**
	 * @typedef {Object} Devlog
	 * @property {string} id
	 * @property {string} title
	 * @property {string} content
	 * @property {number} hours
	 * @property {string[]} projects
	 * @property {any[]} [attachments]
	 * @property {string} created
	 */

	/** @type {{ devlogs: Devlog[], username?: string }} */
	let { devlogs = [], username = 'User' } = $props();

	const pfp = `/pfps/pfp-${Math.floor(Math.random() * (7 - 1) + 1)}.png`;

	/**
	 * Format the date in a Twitter-like style
	 * @param {string} dateString
	 */
	function formatDate(dateString) {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;

		// Format as "MMM D, YYYY"
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	/**
	 * Format hours display
	 * @param {number} hours
	 */
	function formatHours(hours) {
		if (!hours || hours === 0) return null;
		return hours === 1 ? '1 hour' : `${hours} hours`;
	}
</script>

<div class="devlogs-container">
	{#if devlogs.length === 0}
		<div class="empty-state">
			<p>No devlogs yet!</p>
		</div>
	{:else}
		<h4>{devlogs.length} Devlog{devlogs.length !== 1 ? 's' : ''}</h4>
		<div class="devlogs-list">
			{#each devlogs as devlog (devlog.id)}
				<article class="devlog-card">
					<div class="devlog-header">
						<div class="user-info">
							<div class="avatar">
								<img src={pfp} alt={username} />
							</div>
							<div class="user-details">
								<div class="username-line">
									<span class="username">{username}</span>
									{#if formatHours(devlog.hours) && devlog.projects && devlog.projects.length > 0}
										<span class="hours-project">
											spent {formatHours(devlog.hours)} working on:
											{#each devlog.projects as project, i (i)}
												<span class="project-name">{project}</span
												>{#if i < devlog.projects.length - 1},
												{/if}
											{/each}
										</span>
									{/if}
								</div>
								<span class="timestamp">{formatDate(devlog.created)}</span>
							</div>
						</div>
					</div>

					<div class="devlog-content">
						{#if devlog.title}
							<h3 class="devlog-title">{devlog.title}</h3>
						{/if}

						{#if devlog.content}
							<p class="devlog-text">{devlog.content}</p>
						{/if}

						{#if devlog.attachments && devlog.attachments.length > 0}
							<div class="attachments">
								{#each devlog.attachments as attachment, i (i)}
									{#if attachment.type?.startsWith('image/')}
										<img src={attachment.url} alt="Devlog attachment" class="attachment-image" />
									{:else if attachment.type?.startsWith('video/')}
										<video src={attachment.url} controls class="attachment-video"></video>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>

<style>
	h4 {
		color: white;
		padding-left: 10px;
		margin-bottom: 10px;
		margin-top: 0;
	}

	.devlogs-container {
		width: 300px;
		max-width: 300px;
	}

	.devlogs-list {
		max-height: 400px;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 0;
		margin: 0;
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.5) transparent;
	}

	.devlogs-list::-webkit-scrollbar {
		width: 6px;
	}

	.devlogs-list::-webkit-scrollbar-track {
		background: transparent;
	}

	.devlogs-list::-webkit-scrollbar-thumb {
		background-color: rgba(255, 255, 255, 0.5);
		border-radius: 20px;
		border: transparent;
	}

	.devlog-card {
		background-color: #fbf2bf;
		border: 3px solid #f7c881;
		border-radius: 8px;
		padding: 10px;
		margin-bottom: 10px;
		transition: all 0.2s ease;
		max-width: 100%;
		word-wrap: break-word;
		overflow-wrap: break-word;
		box-sizing: border-box;
	}

	.devlog-header {
		display: flex;
		align-items: flex-start;
		margin-bottom: 10px;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		overflow: hidden;
		flex-shrink: 0;
		background: #f5f8fa;
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.user-details {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
		min-width: 0;
	}

	.username-line {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.username {
		font-weight: 700;
		font-size: 14px;
		color: #0f1419;
	}

	.hours-project {
		font-size: 12px;
		color: #536471;
		font-weight: 400;
	}

	.project-name {
		font-weight: 600;
		color: #1d9bf0;
	}

	.timestamp {
		font-size: 12px;
		color: #536471;
	}

	.devlog-content {
		margin-left: 40px;
	}

	.devlog-title {
		font-size: 15px;
		font-weight: 700;
		color: #0f1419;
		margin: 0 0 6px 0;
		line-height: 1.3;
	}

	.devlog-text {
		font-size: 13px;
		color: #0f1419;
		line-height: 1.4;
		margin: 0 0 8px 0;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	.attachments {
		display: grid;
		grid-template-columns: 1fr;
		gap: 6px;
		margin-top: 8px;
		border-radius: 12px;
		overflow: hidden;
	}

	.attachment-image {
		width: 100%;
		height: auto;
		border-radius: 8px;
		border: 1px solid #e1e8ed;
		display: block;
	}

	.attachment-video {
		width: 100%;
		height: auto;
		border-radius: 8px;
		border: 1px solid #e1e8ed;
		display: block;
		background: #000;
	}

	.empty-state {
		text-align: center;
		padding: 24px 16px;
		color: white;
		background: rgba(255, 255, 255, 0.2);
		border: 2px solid rgba(255, 255, 255, 0.5);
		border-radius: 12px;
	}

	.empty-state p {
		margin: 0;
		font-size: 13px;
	}
</style>
