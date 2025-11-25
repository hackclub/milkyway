<script>
	/**
	 * @typedef {Object} Project
	 * @property {string} [name]
	 * @property {string} [githubURL]
	 * @property {string} [shipURL]
	 */

	/**
	 * @typedef {Object} Devlog
	 * @property {string} id
	 * @property {string} title
	 * @property {string} content
	 * @property {number} hours
	 * @property {Project[] | string[]} projects
	 * @property {any[]} [attachments]
	 * @property {string} created
	 * @property {string} [createdISO]
	 * @property {any} [comments]
	 * @property {any} [likes]
	 * @property {string} username
	 * @property {string} userProfile
	 * @property {string | number} [userDevlogStreak]
	 */

	import DevlogComments from '$lib/components/devlogs/DevlogComments.svelte';
	import DevlogLike from '$lib/components/devlogs/DevlogLike.svelte';

	/** @type {{ devlogs?: Devlog[], username?: string, currentUser?: any, isFeed?: boolean, totalCount?: number, page?: number, limit?: number, sort?: string, error?: string, user?: any }} */
	let { 
		devlogs = [], 
		username = 'User', 
		currentUser,
		isFeed = false,
		totalCount = 0,
		page = 1,
		limit = 20,
		sort: currentSort = 'newest',
		error,
		user
	} = $props();

	const totalPages = Math.max(1, Math.ceil(totalCount / limit));

	/**
	 * @param {number} p
	 * @param {string} [sortVal]
	 */
	function pageUrl(p, sortVal = currentSort) {
		return `?page=${p}&limit=${limit}&sort=${encodeURIComponent(sortVal || 'newest')}`;
	}

	/**
	 * @param {Event} e
	 */
	function handleSortChange(e) {
		const target = e.target;
		if (target instanceof HTMLSelectElement) {
			const newSort = target.value;
			// Save preference to localStorage
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem('devlogsSortPreference', newSort);
			}
			// Navigate to page 1 with the new sort, resetting pagination
			window.location.href = `?page=1&limit=${limit}&sort=${encodeURIComponent(newSort)}`;
		}
	}

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
	 * @param {number | undefined} hours
	 */
	function formatHours(hours) {
		if (!hours || hours === 0) return null;
		return hours === 1 ? '1 hour' : `${hours} hours`;
	}

	/**
	 * Get a random profile picture
	 * @param {string} usr
	 */
	function getPfp(usr) {
		// Use username hash to get consistent PFP for each user
		const hash = usr
			.split('')
			.reduce((acc, char) => acc + char.charCodeAt(0), 0);
		const pfpNum = (hash % 7) + 1;
		return `/pfps/pfp-${pfpNum}.png`;
	}

	// On mount, check if user has a saved sort preference and no sort param was provided
	if (typeof window !== 'undefined' && isFeed) {
		const urlParams = new URLSearchParams(window.location.search);
		const savedSort = typeof localStorage !== 'undefined' ? localStorage.getItem('devlogsSortPreference') : null;
		
		// If no sort param in URL but we have a saved preference, redirect to use it
		if (!urlParams.has('sort') && savedSort && savedSort !== 'newest') {
			window.location.href = `?page=1&limit=${limit}&sort=${encodeURIComponent(savedSort)}`;
		}
	}
</script>

{#if isFeed}
	<!-- Feed view (from +page.svelte) -->
	<div class="devlogs-feed">
		<div class="feed-header">
			<h1>Community Devlogs</h1>
			<p class="feed-subtitle">See what everyone's working on</p>

			<div class="sort-form" aria-label="Sort devlogs">
				<label for="sort-select">Sort:</label>
				<select id="sort-select" onchange={handleSortChange} value={currentSort}>
					<option value="newest">Newest</option>
					<option value="top-likes">Top likes</option>
					<option value="top-comments">Top comments</option>
					<option value="likes-week">Top likes this week</option>
					<option value="comments-week">Top comments this week</option>
				</select>
			</div>
		</div>

		{#if error}
			<div class="error-message">
				<p>Failed to load devlogs: {error}</p>
			</div>
		{:else if devlogs.length === 0}
			<div class="empty-state">
				<p>No devlogs yet! Be the first to share what you're working on.</p>
			</div>
		{:else}
			<div class="devlogs-container devlogs-feed">
				{#each devlogs as devlog (devlog.id)}
					<article class="devlog-card">
						<div class="devlog-header">
							<div class="user-info">
								<div class="avatar">
									<img src={getPfp(devlog.username)} alt={devlog.username} />
								</div>
								<div class="user-details">
									<div class="username-line">
										<div class="username-row">
											<a class="username" href={devlog.userProfile}>{devlog.username}</a>
											{#if devlog.userDevlogStreak && Number(devlog.userDevlogStreak) > 0}
												<span class="streak-inline">🔥 {devlog.userDevlogStreak}</span>
											{/if}
										</div>
										{#if formatHours(devlog.hours) && devlog.projects && devlog.projects.length > 0}
											<span class="hours-project">
												spent {formatHours(devlog.hours)} working on:
												{#each devlog.projects as project, i (i)}
													{@const proj = typeof project === 'string' ? {} : project}
													<span class="project-item">
														<span class="project-name">{proj.name || project}</span>
													</span>
													{#if i < devlog.projects.length - 1}, {/if}
												{/each}
											</span>
										{/if}
									</div>
									{#if devlog.createdISO}
										<span class="timestamp">{formatDate(devlog.createdISO)}</span>
									{/if}
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

							{#if Array.isArray(devlog.attachments) && devlog.attachments.length > 0}
								<div class="attachments">
									{#each devlog.attachments as attachment, i (i)}
										{@const attachmentObj = /** @type {any} */ (attachment)}
										{#if attachmentObj.type?.startsWith('image/')}
											<img
												src={attachmentObj.url}
												alt="Devlog attachment"
												class="attachment-image"
											/>
										{:else if attachmentObj.type?.startsWith('video/')}
											<video src={attachmentObj.url} controls class="attachment-video">
												<track kind="captions" />
											</video>
										{/if}
									{/each}
								</div>
							{/if}

						<div class="devlog-actions">
							<DevlogLike devlogId={devlog.id} likes={devlog.likes} currentUser={currentUser || user} />
							<DevlogComments devlogId={devlog.id} comments={devlog.comments || []} currentUser={currentUser || user} />
							{#if devlog.projects && devlog.projects.length > 0}
								<div class="project-action-links">
									{#each devlog.projects as project (typeof project === 'string' ? project : project.name)}
										{@const proj = typeof project === 'string' ? {} : project}
										{#if proj.githubURL}
											<a class="project-link github-link" href={proj.githubURL} target="_blank" rel="noopener noreferrer" title={`View ${proj.name} on GitHub`} aria-label={`GitHub repository for ${proj.name}`}>
												<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
													<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
												</svg>
											</a>
										{/if}
										{#if proj.shipURL}
											<a class="project-link ship-link" href={proj.shipURL} target="_blank" rel="noopener noreferrer" title={`Play ${proj.name} on Itch.io`} aria-label={`Itch.io page for ${proj.name}`}>
												<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
													<path d="M8 5v14l11-7z"/>
												</svg>
											</a>
										{/if}
									{/each}
								</div>
							{/if}
						</div>
						</div>
					</article>
				{/each}
			</div>

			<div class="feed-info">
				{#if totalCount > 0}
					{@const start = (page - 1) * limit + 1}
					{@const end = Math.min(totalCount, page * limit)}
					<p>Showing {start}–{end} of {totalCount} devlog{totalCount !== 1 ? 's' : ''}</p>
					<nav class="pagination" aria-label="Devlogs pages">
						{#if page > 1}
							<a class="page-link" href={pageUrl(page - 1)}>← Prev</a>
						{/if}
						{#each Array.from({ length: Math.min(5, totalPages) }) as _, i}
							{@const firstPage = Math.max(1, Math.min(totalPages - 4, page - 2))}
							{@const p = firstPage + i}
							{#if p <= totalPages}
								<a class="page-link {p === page ? 'active' : ''}" href={pageUrl(p)}>{p}</a>
							{/if}
						{/each}
						{#if page < totalPages}
							<a class="page-link" href={pageUrl(page + 1)}>Next →</a>
						{/if}
					</nav>
				{:else}
					<p>No devlogs found.</p>
				{/if}
			</div>
		{/if}
	</div>
{:else}
	<!-- Sidebar view (original) -->
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
									<img src={getPfp(username)} alt={username} />
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
											<video src={attachment.url} controls class="attachment-video"><track kind="captions" /></video>
										{/if}
									{/each}
								</div>
							{/if}
						<div class="devlog-actions">
							<DevlogLike devlogId={devlog.id} likes={devlog.likes} {currentUser} />
							<DevlogComments devlogId={devlog.id} comments={devlog.comments || []} {currentUser} />
							{#if devlog.projects && devlog.projects.length > 0}
								<div class="project-action-links">
									{#each devlog.projects as project (typeof project === 'string' ? project : project.name)}
										{@const proj = typeof project === 'string' ? {} : project}
										{#if proj.githubURL}
											<a class="project-link github-link" href={proj.githubURL} target="_blank" rel="noopener noreferrer" title={`View ${proj.name} on GitHub`} aria-label={`GitHub repository for ${proj.name}`}>
												<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
													<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
												</svg>
											</a>
										{/if}
										{#if proj.shipURL}
											<a class="project-link ship-link" href={proj.shipURL} target="_blank" rel="noopener noreferrer" title={`Play ${proj.name} on Itch.io`} aria-label={`Itch.io page for ${proj.name}`}>
												<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
													<path d="M8 5v14l11-7z"/>
												</svg>
											</a>
										{/if}
										{#if !proj.githubURL && !proj.shipURL}
											<span class="project-tag">{typeof project === 'string' ? project : proj.name}</span>
										{/if}
									{/each}
								</div>
							{/if}
						</div>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	h4 {
		color: white;
		padding-left: 10px;
		margin-bottom: 10px;
		margin-top: 0;
	}

	/* Feed view styles */
	.devlogs-feed {
		max-width: 600px;
		margin: 0 auto;
	}

	.feed-header {
		text-align: center;
		margin-bottom: 40px;
		color: white;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
	}

	.feed-header h1 {
		font-size: 2.5em;
		margin: 0 0 8px 0;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 2px;
	}

	.sort-form {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin-top: 12px;
	}

	.sort-form select {
		padding: 6px 8px;
		border-radius: 6px;
		border: 1px solid #e2e8f0;
	}

	.feed-subtitle {
		margin: 0;
		font-size: 1.1em;
		opacity: 0.9;
	}

	.feed-info {
		text-align: center;
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 40px;
		font-size: 0.9em;
	}

	.pagination {
		display: flex;
		align-items: center;
		gap: 8px;
		justify-content: center;
		margin-top: 10px;
	}

	.page-link {
		padding: 6px 8px;
		border-radius: 6px;
		background: rgba(255,255,255,0.08);
		color: white;
		text-decoration: none;
		font-weight: 700;
	}

	.page-link.active {
		background: #1d9bf0;
		color: white;
	}

	/* Sidebar view styles */
	.devlogs-container {
		width: 300px;
		max-width: 300px;
	}

	/* Feed view uses full width */
	.devlogs-container.devlogs-feed {
		width: 100%;
		max-width: 100%;
		display: flex;
		flex-direction: column;
		gap: 20px;
		margin-bottom: 40px;
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

	/* Shared card styles */
	.devlog-card {
		background-color: #fbf2bf;
		border: 3px solid #f7c881;
		border-radius: 8px;
		transition: all 0.2s ease;
		max-width: 100%;
		word-wrap: break-word;
		overflow-wrap: break-word;
		box-sizing: border-box;
		position: relative;
	}

	/* Feed view card sizes */
	.devlogs-feed .devlog-card {
		padding: 20px;
		margin-bottom: 20px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.devlogs-feed .devlog-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
	}

	/* Sidebar view card sizes */
	.devlogs-container:not(.devlogs-feed) .devlog-card {
		padding: 10px;
		margin-bottom: 10px;
	}

	.devlogs-container:not(.devlogs-feed) .devlog-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
	}

	.devlog-header {
		display: flex;
		align-items: flex-start;
		margin-bottom: 10px;
		position: relative;
		z-index: 5;
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

	/* Feed view larger avatar */
	.devlogs-feed .avatar {
		width: 48px;
		height: 48px;
		border: 2px solid #f7c881;
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

	/* Feed view user details spacing */
	.devlogs-feed .user-details {
		gap: 4px;
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

	/* Feed view larger username */
	.devlogs-feed .username {
		font-size: 16px;
	}

	.username-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
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

	.project-item {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-right: 8px;
	}

	.timestamp {
		font-size: 12px;
		color: #536471;
	}

	.devlog-content {
		margin-left: 0;
	}

	.devlog-title {
		font-size: 15px;
		font-weight: 700;
		color: #0f1419;
		margin: 0 0 6px 0;
		line-height: 1.3;
	}

	/* Feed view larger title */
	.devlogs-feed .devlog-title {
		font-size: 18px;
		margin: 0 0 10px 0;
	}

	.devlog-text {
		font-size: 13px;
		color: #0f1419;
		line-height: 1.4;
		margin: 0 0 8px 0;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	/* Feed view larger text */
	.devlogs-feed .devlog-text {
		font-size: 15px;
		line-height: 1.5;
		margin: 0 0 12px 0;
	}

	.attachments {
		display: grid;
		grid-template-columns: 1fr;
		gap: 6px;
		margin-top: 8px;
		border-radius: 12px;
		overflow: hidden;
		margin-bottom: 8px;
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

	.devlog-actions {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-top: 8px;
		padding-top: 4px;
		border-top: 1px solid #e1e8ed;
		flex-wrap: wrap;
	}

	.project-action-links {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-left: auto;
	}

	.project-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		color: #1d9bf0;
		text-decoration: none;
		border-radius: 6px;
		transition: all 0.2s ease;
		padding: 6px;
		background: rgba(29, 155, 240, 0.08);
		border: 2px solid #1d9bf0;
	}

	.project-link:hover {
		background: rgba(29, 155, 240, 0.15);
		border-color: #0a81d4;
		transform: scale(1.05);
	}

	.project-link svg {
		width: 100%;
		height: 100%;
	}

	.project-tag {
		display: inline-flex;
		align-items: center;
		padding: 2px 6px;
		background: rgba(29, 155, 240, 0.1);
		border: 1px solid #1d9bf0;
		border-radius: 4px;
		font-size: 11px;
		color: #1d9bf0;
		font-weight: 600;
	}

	.streak-inline {
		background: #fff3cd;
		border: 1px solid #ffd966;
		padding: 2px 8px;
		border-radius: 16px;
		font-size: 12px;
		margin-left: 8px;
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

	.error-message {
		text-align: center;
		padding: 30px;
		background: rgba(255, 100, 100, 0.1);
		border: 2px solid rgba(255, 100, 100, 0.3);
		border-radius: 12px;
		color: #ff6b6b;
		backdrop-filter: blur(10px);
	}

	.error-message p {
		margin: 0;
	}
</style>
