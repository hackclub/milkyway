<script>
	let { data } = $props();

	let stats = $state({
		total: data.stats?.totalArtlogs ?? 0,
		reviewed: data.stats?.reviewedCount ?? 0,
		remaining: data.stats?.remainingCount ?? 0,
		reviewedByMe: data.stats?.reviewedByCurrentUser ?? 0
	});

	let artlogs = $state(
		(data.artlogs || []).map((log) => ({
			...log,
			approvedHoursInput: log.hours ?? 0,
			reviewNote: '',
			isSubmitting: false,
			error: ''
		}))
	);

	/**
	 * @param {string} url
	 */
	function isLikelyVideo(url) {
		if (!url || typeof url !== 'string') return false;
		const lower = url.toLowerCase();
		return (
			lower.endsWith('.mp4') ||
			lower.endsWith('.webm') ||
			lower.endsWith('.ogg') ||
			lower.includes('cdn') // best-effort for common hosting, will still fall back gracefully
		);
	}

	/**
	 * @param {string} iso
	 */
	function formatDate(iso) {
		if (!iso) return '';
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return '';
		return d.toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	/**
	 * @param {any} log
	 */
	function isDecreased(log) {
		const original = Number(log.hours || 0);
		const current = Number(log.approvedHoursInput ?? 0);
		return current >= 0 && current < original;
	}

	/**
	 * @param {any} log
	 */
	function needsNote(log) {
		const original = Number(log.hours || 0);
		const current = Number(log.approvedHoursInput ?? 0);
		return current === 0 || current < original;
	}

	/**
	 * @param {any} log
	 * @param {'approve' | 'reject'} action
	 */
	async function submitReview(log, action) {
		if (log.isSubmitting) return;

		log.error = '';

		const originalHours = Number(log.hours || 0);
		let approvedHours =
			action === 'reject' ? 0 : Number(log.approvedHoursInput ?? 0);

		if (!Number.isFinite(approvedHours) || approvedHours < 0) {
			log.error = 'approved hours must be a non-negative number';
			return;
		}

		if (approvedHours > originalHours + 0.001) {
			log.error = 'approved hours cannot be more than logged hours';
			return;
		}

		const isReject = approvedHours === 0;
		const isDecrease = approvedHours < originalHours;
		const noteRequired = isReject || isDecrease;

		if (
			noteRequired &&
			(!log.reviewNote || String(log.reviewNote).trim().length === 0)
		) {
			log.error =
				'please add a note when rejecting or decreasing approved hours.';
			return;
		}

		log.isSubmitting = true;

		try {
			const res = await fetch('/api/reviewer/artlogs', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					artlogId: log.id,
					approvedHours,
					reviewNote: log.reviewNote ?? ''
				})
			});

			const result = await res.json();

			if (!res.ok || !result.success) {
				const message =
					result?.error?.message ||
					result?.error ||
					'failed to save review';
				log.error = message;
				return;
			}

			// Remove this artlog from local queue
			artlogs = artlogs.filter((item) => item.id !== log.id);

			// Update stats locally
			stats.reviewed += 1;
			stats.reviewedByMe += 1;
			if (stats.remaining > 0) {
				stats.remaining -= 1;
			}
		} catch (err) {
			console.error('Error submitting artlog review:', err);
			log.error = 'failed to save review. please try again.';
		} finally {
			log.isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Artlog Reviews ✦ Milkyway</title>
</svelte:head>

<main class="review-page">
	<section class="header">
		<h1>artlog reviews</h1>
		<p class="subtitle">
			approve hours for artlogs. when rejecting or decreasing hours, please leave a short
			note explaining why.
		</p>

		<div class="stats-row">
			<div class="stat-card">
				<div class="stat-label">total artlogs</div>
				<div class="stat-value">{stats.total}</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">artlogs reviewed</div>
				<div class="stat-value">{stats.reviewed}</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">artlogs left</div>
				<div class="stat-value">{stats.remaining}</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">artlogs you reviewed</div>
				<div class="stat-value">{stats.reviewedByMe}</div>
			</div>
		</div>
	</section>

	{#if artlogs.length === 0}
		<section class="empty-state">
			<p>no pending artlogs in your queue right now. 🎉</p>
			<p class="hint">refresh the page later to see if new artlogs have arrived.</p>
		</section>
	{:else}
		<section class="artlog-list">
			{#each artlogs as log (log.id)}
				<article class="artlog-card">
					<div class="artlog-main">
						<div class="art-visual">
							{#if log.image}
								<img src={log.image} alt="artlog" class="art-image" />
								<div class="image-detail-link-row">
									<a
										href={log.image}
										target="_blank"
										rel="noopener noreferrer"
										class="image-detail-link"
									>
										view picture in detail →
									</a>
								</div>
							{:else}
								<div class="art-image placeholder">no image</div>
							{/if}
						</div>

						<div class="art-info">
							<div class="art-meta">
								<div class="art-meta-row">
									{#if log.username}
										<span class="username">by {log.username}</span>
									{:else}
										<span class="username unknown">by unknown user</span>
									{/if}
									<span class="hours-tag">{log.hours}h logged</span>
								</div>
								{#if log.created}
									<div class="art-date">
										submitted {formatDate(log.created)}
									</div>
								{/if}
							</div>

							<p class="description">{log.description}</p>

							{#if log.proof}
								<div class="proof-block">
									<a
										href={log.proof}
										target="_blank"
										rel="noopener noreferrer"
										class="proof-link"
									>
										open proof link →
									</a>

									{#if isLikelyVideo(log.proof)}
										<div class="proof-video-wrapper">
											<video src={log.proof} controls class="proof-video">
												<track kind="captions" />
											</video>
										</div>
									{/if}
								</div>
							{/if}

							{#if log.rereviewRequest}
								<div class="rereview-box">
									<div class="rereview-label">re-review request</div>
									<pre class="rereview-text">{log.rereviewRequest}</pre>
								</div>
							{/if}
						</div>
					</div>

					{#if log.project}
						<div class="project-box">
							<div class="project-header">
								<h2 class="project-name">{log.project.name}</h2>
								{#if log.project.totalHours !== undefined}
									<div class="project-hours">
										{log.project.totalHours}h total (code + art)
									</div>
								{/if}
							</div>

							{#if log.project.description}
								<p class="project-description">{log.project.description}</p>
							{/if}

							<div class="project-links">
								{#if log.project.shipURL}
									<a
										href={log.project.shipURL}
										target="_blank"
										rel="noopener noreferrer"
										class="project-link primary"
									>
										play game
									</a>
								{/if}

								{#if log.project.githubURL}
									<a
										href={log.project.githubURL}
										target="_blank"
										rel="noopener noreferrer"
										class="project-link"
									>
										view code
									</a>
								{/if}
							</div>
						</div>
					{/if}

					<div class="review-section">
						<div class="review-row">
							<div class="field">
								<label for={"approved-" + log.id}>approved hours</label>
								<input
									id={"approved-" + log.id}
									type="number"
									min="0"
									max={log.hours}
									step="0.1"
									bind:value={log.approvedHoursInput}
								/>
								<div class="field-hint">
									original: {log.hours}h · approved hours cannot be more than this.
								</div>
							</div>
						</div>

						<div class="field">
							<label for={"note-" + log.id}>
								review note
								{#if needsNote(log)}
									<span class="required-note">(required for reject / decrease)</span>
								{/if}
							</label>
							<textarea
								id={"note-" + log.id}
								rows="3"
								bind:value={log.reviewNote}
								placeholder="short explanation for the artist (eg. &quot;timelapse doesn't show full duration&quot; or &quot;hours seem high for the visible work&quot;)"
							></textarea>
						</div>

						{#if log.error}
							<div class="error-message">{log.error}</div>
						{/if}

						<div class="button-row">
							<button
								type="button"
								class="btn reject"
								disabled={log.isSubmitting}
								onclick={() => submitReview(log, 'reject')}
							>
								{log.isSubmitting ? 'saving...' : 'reject'}
							</button>
							<button
								type="button"
								class="btn approve"
								disabled={log.isSubmitting}
								onclick={() => submitReview(log, 'approve')}
							>
								{#if isDecreased(log)}
									{log.isSubmitting ? 'saving...' : 'decrease and approve'}
								{:else}
									{log.isSubmitting ? 'saving...' : 'approve'}
								{/if}
							</button>
						</div>
					</div>
				</article>
			{/each}
		</section>
	{/if}
</main>

<style>
	.review-page {
		min-height: 100vh;
		padding: 24px 16px 40px;
		box-sizing: border-box;
		background: var(--yellow, #fff7cc);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 24px;
	}

	.header {
		max-width: 1100px;
		width: 100%;
		background: #fff7e0;
		border: 3px solid var(--orange, #ff9f1c);
		border-radius: 10px;
		padding: 16px 20px 20px;
		box-sizing: border-box;
	}

	h1 {
		margin: 0 0 8px 0;
		color: var(--orange, #ff9f1c);
		font-size: 1.6rem;
	}

	.subtitle {
		margin: 0 0 16px 0;
		font-size: 0.9rem;
		color: #555;
	}

	.stats-row {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.stat-card {
		flex: 1;
		min-width: 140px;
		background: #fff;
		border-radius: 8px;
		border: 2px solid var(--orange, #ff9f1c);
		padding: 10px 12px;
		box-sizing: border-box;
	}

	.stat-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #777;
		margin-bottom: 4px;
	}

	.stat-value {
		font-size: 1.2rem;
		font-weight: bold;
		color: #333;
	}

	.empty-state {
		max-width: 600px;
		width: 100%;
		text-align: center;
		background: #fff;
		border-radius: 10px;
		border: 3px solid var(--orange, #ff9f1c);
		padding: 24px 20px;
		box-sizing: border-box;
		color: #444;
	}

	.empty-state .hint {
		margin-top: 8px;
		font-size: 0.85rem;
		color: #777;
	}

	.artlog-list {
		max-width: 1100px;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.artlog-card {
		background: #fffdf4;
		border-radius: 10px;
		border: 3px solid var(--orange, #ff9f1c);
		padding: 16px 18px 18px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.artlog-main {
		display: grid;
		grid-template-columns: 220px minmax(0, 1fr);
		gap: 16px;
	}

	.art-visual {
		width: 100%;
	}

	.art-image {
		width: 100%;
		height: 180px;
		border-radius: 8px;
		border: 2px solid var(--orange, #ff9f1c);
		object-fit: cover;
		background: #f5f5f5;
		display: block;
	}

	.art-image.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.9rem;
		color: #888;
	}

	.image-detail-link-row {
		margin-top: 6px;
	}

	.image-detail-link {
		font-size: 0.8rem;
		color: var(--orange, #ff9f1c);
		text-decoration: none;
	}

	.image-detail-link:hover {
		text-decoration: underline;
	}

	.art-info {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.art-meta-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		justify-content: space-between;
	}

	.username {
		font-weight: 600;
		color: #333;
	}

	.username.unknown {
		color: #777;
	}

	.art-date {
		margin-top: 2px;
		font-size: 0.8rem;
		color: #777;
	}

	.hours-tag {
		font-size: 0.85rem;
		background: #ffe7b5;
		color: #8b4513;
		border-radius: 999px;
		padding: 2px 10px;
		border: 1px solid #f0b76a;
	}

	.description {
		margin: 0;
		font-size: 0.9rem;
		color: #333;
		line-height: 1.4;
		white-space: pre-wrap;
	}

	.proof-block {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.proof-link {
		font-size: 0.85rem;
		color: var(--orange, #ff9f1c);
		text-decoration: none;
		font-weight: 600;
	}

	.proof-link:hover {
		text-decoration: underline;
	}

	.proof-video-wrapper {
		width: 100%;
		max-width: 360px;
		border-radius: 8px;
		overflow: hidden;
		border: 2px solid var(--orange, #ff9f1c);
		background: #000;
	}

	.proof-video {
		width: 100%;
		height: 200px;
		object-fit: contain;
		display: block;
	}

	.rereview-box {
		margin-top: 8px;
		padding: 8px 10px;
		border-radius: 6px;
		border: 1px solid #d0a44b;
		background: #fff7d3;
	}

	.rereview-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: #7b5a1d;
		margin-bottom: 4px;
	}

	.rereview-text {
		margin: 0;
		font-size: 0.8rem;
		white-space: pre-wrap;
		color: #4a3f1a;
	}

	.project-box {
		border-radius: 8px;
		border: 2px solid #e1c26b;
		background: #fff7d3;
		padding: 10px 12px 12px;
	}

	.project-header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
	}

	.project-name {
		margin: 0;
		font-size: 1rem;
		color: #5a4a1d;
	}

	.project-hours {
		font-size: 0.8rem;
		color: #7b6a30;
	}

	.project-description {
		margin: 6px 0 8px 0;
		font-size: 0.85rem;
		color: #4a3f1a;
		line-height: 1.35;
	}

	.project-links {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.project-link {
		font-size: 0.8rem;
		padding: 4px 10px;
		border-radius: 999px;
		border: 1px solid #b99b51;
		text-decoration: none;
		color: #5a4a1d;
		background: #fff;
	}

	.project-link.primary {
		background: #5a9b5e;
		border-color: #4a8b4e;
		color: #fff;
	}

	.project-link:hover {
		opacity: 0.9;
	}

	.review-section {
		margin-top: 6px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.review-row {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.field {
		flex: 1;
		min-width: 200px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	label {
		font-size: 0.85rem;
		font-weight: 600;
		color: #444;
	}

	.required-note {
		font-weight: normal;
		font-size: 0.8rem;
		color: #a64b00;
		margin-left: 4px;
	}

	input[type='number'],
	textarea {
		border-radius: 6px;
		border: 2px solid var(--orange, #ff9f1c);
		padding: 6px 8px;
		font-family: inherit;
		font-size: 0.9rem;
		box-sizing: border-box;
		background: #fff;
	}

	input[type='number']:focus,
	textarea:focus {
		outline: none;
		border-color: #e67e00;
	}

	textarea {
		resize: vertical;
		min-height: 70px;
	}

	.field-hint {
		font-size: 0.75rem;
		color: #777;
	}

	.error-message {
		padding: 6px 8px;
		font-size: 0.8rem;
		color: #b3261e;
		background: #ffe6e3;
		border-radius: 6px;
		border: 1px solid #f28b82;
	}

	.button-row {
		display: flex;
		gap: 10px;
		justify-content: flex-end;
	}

	.btn {
		min-width: 120px;
		padding: 8px 12px;
		border-radius: 999px;
		border: 2px solid transparent;
		font-size: 0.85rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn.reject {
		background: #fff;
		color: #b3261e;
		border-color: #f28b82;
	}

	.btn.reject:hover:not(:disabled) {
		background: #ffe6e3;
	}

	.btn.approve {
		background: var(--orange, #ff9f1c);
		color: #fff;
		border-color: #e67e00;
	}

	.btn.approve:hover:not(:disabled) {
		background: #e67e00;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 800px) {
		.artlog-main {
			grid-template-columns: 1fr;
		}

		.art-image {
			height: 200px;
		}

		.button-row {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>

