<script lang="ts">
	// no extra imports needed

	let { showPopup, onClose, user, onUserUpdate = () => {} } = $props();

	// Form state
	let username = $state(user?.username || '');
	let githubUsername = $state(user?.githubUsername || '');
	let howDidYouHear = $state(user?.howDidYouHear || '');
	let doingWell = $state(user?.doingWell || '');
	let improve = $state(user?.improve || '');
	let isSubmitting = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	let sessionWarned = $state(false);
	let sessionRevealed = $state(false);
	let sessionLoading = $state(false);
	let sessionId = $state('');
	let sessionMasked = $state('');
	let sessionError = $state('');
	let copySuccess = $state(false);

	async function fetchSessionId() {
		sessionLoading = true;
		sessionError = '';

		try {
			const res = await fetch('/api/session', { credentials: 'same-origin' });
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}
			const data = await res.json();
			sessionId = data?.sessionId || '';
			sessionMasked = data?.masked || '';
		} catch (err) {
			sessionError = err.message;
			sessionId = '';
			sessionMasked = '';
		} finally {
			sessionLoading = false;
		}
	}

	async function handleWarnedAck() {
		sessionLoading = true;
		sessionError = '';
		await fetchSessionId();
		sessionWarned = true;
		sessionLoading = false;
	}

	function handleReveal() {
		if (!sessionRevealed) {
			sessionRevealed = true;
		}
	}

	async function handleCopy() {
		if (!sessionId) return;
		try {
			await navigator.clipboard.writeText(sessionId);
			copySuccess = true;
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		} catch {
			sessionError = 'Failed to copy to clipboard';
		}
	}

	// Handle profile form submission
	async function handleProfileSubmit() {
		if (isSubmitting) return;

		isSubmitting = true;
		errorMessage = '';
		successMessage = '';

		try {
			const response = await fetch('/api/update-profile', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					username: username.trim(),
					githubUsername: githubUsername.trim(),
					howDidYouHear: howDidYouHear.trim(),
					doingWell: doingWell.trim(),
					improve: improve.trim()
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to update profile');
			}

			successMessage = 'Profile updated successfully!';

			// Notify parent component that user data has been updated
			onUserUpdate();

			// Close popup after a short delay
			setTimeout(() => {
				onClose();
			}, 1500);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
		} finally {
			isSubmitting = false;
		}
	}

	// Handle escape key
	function handleKeydown(event) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	// Reset form when popup closes
	function handleClose() {
		username = user?.username || '';
		githubUsername = user?.githubUsername || '';
		howDidYouHear = user?.howDidYouHear || '';
		doingWell = user?.doingWell || '';
		improve = user?.improve || '';
		errorMessage = '';
		successMessage = '';
		onClose();
	}

	// Load data when popup opens
	$effect(() => {
		if (showPopup) {
			// Reset and populate profile fields
			username = user?.username || '';
			githubUsername = user?.githubUsername || '';
			howDidYouHear = user?.howDidYouHear || '';
			doingWell = user?.doingWell || '';
			improve = user?.improve || '';
			// Reset session reveal state when popup opens
			sessionWarned = false;
			sessionRevealed = false;
			sessionLoading = false;
			sessionId = '';
			sessionMasked = '';
			sessionError = '';
		}
	});
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showPopup}
	<div
		class="popup-overlay"
		onclick={handleClose}
		role="dialog"
		aria-modal="true"
		aria-labelledby="profile-settings-title"
		tabindex="0"
	>
		<div class="popup-content" onclick={(e) => e.stopPropagation()} role="document">
			<button class="popup-close" onclick={handleClose}>×</button>

			<div class="popup-header">
				<h3 id="profile-settings-title">Profile Settings</h3>
			</div>

			<div class="popup-body">
				<!-- Profile Section -->
				<div class="section">
					<h4>Profile Information</h4>

					<!-- Username -->
					<div class="form-group">
						<label for="username-field">Username</label>
						<input
							type="text"
							id="username-field"
							bind:value={username}
							placeholder="Enter your username"
							disabled={isSubmitting}
						/>
					</div>

					<!-- GitHub Username -->
					<div class="form-group">
						<label for="github-field">GitHub Username</label>
						<input
							type="text"
							id="github-field"
							bind:value={githubUsername}
							placeholder="Enter your GitHub username"
							disabled={isSubmitting}
						/>
					</div>

					<!-- How did you hear about this? -->
					<div class="form-group">
						<label for="how-did-you-hear-field">How did you hear about this?</label>
						<input
							type="text"
							id="how-did-you-hear-field"
							bind:value={howDidYouHear}
							placeholder="from my friend XX, #announcements, email, school, etc"
							disabled={isSubmitting}
						/>
					</div>

					<!-- What are we doing well? -->
					<div class="form-group">
						<label for="doing-well-field">What are we doing well?</label>
						<textarea
							id="doing-well-field"
							bind:value={doingWell}
							placeholder="what do you like about the program/platform?"
							rows="3"
							disabled={isSubmitting}
						></textarea>
					</div>

					<!-- How can we improve? -->
					<div class="form-group">
						<label for="improve-field">How can we improve?</label>
						<textarea
							id="improve-field"
							bind:value={improve}
							placeholder="what else can we add to make this better?"
							rows="3"
							disabled={isSubmitting}
						></textarea>
					</div>

					{#if errorMessage}
						<div class="error-message">
							{errorMessage}
						</div>
					{/if}

					{#if successMessage}
						<div class="success-message">
							{successMessage}
						</div>
					{/if}

					<div class="form-actions">
						<button type="button" onclick={handleProfileSubmit} disabled={isSubmitting}>
							{isSubmitting ? 'Saving...' : 'Save profile info'}
						</button>
					</div>
				</div>

				<div class="section">
					<h4>Secrets</h4>

					<p>Session ID:</p>
					{#if !sessionWarned}
						<!-- Initial warning state -->
						<div class="secret-warning">
							<p>
								⚠️ Sharing your session id allows people to do shady stuff on your behalf, make sure
								you know what you're doing
							</p>
							<button class="btn-reveal" onclick={handleWarnedAck} disabled={sessionLoading}>
								{sessionLoading ? 'Loading...' : 'I understand, show me'}
							</button>
							{#if sessionError}
								<p class="error-text">{sessionError}</p>
							{/if}
						</div>
					{:else if !sessionRevealed}
						<div class="secret-reveal-prompt">
							<div class="secret-preview">
								<div class="secret-display masked">{sessionMasked}</div>
							</div>
							<button class="btn-reveal primary" onclick={handleReveal} disabled={sessionLoading}>
								Reveal
							</button>
						</div>
					{:else}
						<div class="secret-revealed">
							<div class="secret-display full">
								<code>{sessionId}</code>
								<button class="btn-copy" onclick={handleCopy} title="Copy to clipboard">
									📋
								</button>
							</div>
							{#if copySuccess}
								<p class="success-text">✓ Copied!</p>
							{/if}
							{#if sessionError}
								<p class="error-text">{sessionError}</p>
							{/if}

							<button class="btn-hide" onclick={() => (sessionRevealed = false)}> Hide </button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.popup-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.popup-content {
		background-color: #fbf2bf;
		border: 4px solid #f7c881;
		border-radius: 8px;
		padding: 32px;
		position: relative;
		max-width: 600px;
		width: 90%;
		max-height: 80vh;
		overflow-y: auto;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.popup-header {
		margin-bottom: 24px;
	}

	.popup-header h3 {
		margin: 0;
		color: #2c3e50;
		font-size: 1.2em;
		font-weight: 600;
		text-align: center;
	}

	.popup-close {
		position: absolute;
		top: 16px;
		right: 20px;
		background: var(--yellow);
		border: 2px solid var(--orange);
		border-radius: 4px;
		font-size: 16px;
		cursor: pointer;
		color: var(--orange);
		padding: 4px 8px;
		width: auto;
		height: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: 0.2s;
	}

	.popup-close:hover {
		background: var(--orange);
		color: white;
	}

	.popup-body {
		color: #2c3e50;
	}

	.section {
		margin-bottom: 32px;
	}

	.section h4 {
		margin: 0 0 16px 0;
		font-size: 1em;
		font-weight: 600;
		color: #2c3e50;
	}

	.form-group {
		margin-bottom: 16px;
	}

	.form-group label {
		font-size: 0.7em;
		color: #666;
		font-weight: normal;
		margin: 0;
		padding: 0;
		opacity: 0.7;
		text-transform: lowercase;
	}

	.form-group input {
		width: 100%;
		padding: 12px;
		border: none;
		border-bottom: 3px solid #f7c881;
		border-radius: 0;
		font-size: 1em;
		font-family: inherit;
		background-color: transparent;
		color: #2c3e50;
		box-sizing: border-box;
		transition: border-bottom-color 0.2s;
		min-height: 40px;
	}

	.form-group input:hover {
		border-bottom: 3px solid #e67e22;
	}

	.form-group input:focus {
		outline: none;
		border-bottom: 3px solid #e67e22;
	}

	.form-group input:disabled {
		background-color: transparent;
		color: #6c757d;
		cursor: not-allowed;
		border-bottom: 3px solid #ccc;
	}

	.form-group textarea {
		width: 100%;
		padding: 12px;
		border: none;
		border-bottom: 3px solid #f7c881;
		border-radius: 0;
		font-size: 1em;
		font-family: inherit;
		background-color: transparent;
		color: #2c3e50;
		box-sizing: border-box;
		transition: border-bottom-color 0.2s;
		min-height: 80px;
		resize: vertical;
	}

	.form-group textarea:hover {
		border-bottom: 3px solid #e67e22;
	}

	.form-group textarea:focus {
		outline: none;
		border-bottom: 3px solid #e67e22;
	}

	.form-group textarea:disabled {
		background-color: transparent;
		color: #6c757d;
		cursor: not-allowed;
		border-bottom: 3px solid #ccc;
	}

	.error-message {
		background-color: #f8d7da;
		color: #721c24;
		padding: 8px 12px;
		border-radius: 4px;
		margin-bottom: 12px;
		font-size: 0.9em;
		border: 1px solid #f5c6cb;
	}

	.success-message {
		background-color: var(--yellow);
		color: #2c3e50;
		padding: 8px 12px;
		border-radius: 4px;
		margin-bottom: 12px;
		font-size: 0.9em;
		border: 2px solid var(--orange);
	}

	.form-actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
		margin-top: 24px;
	}

	.form-actions button {
		padding: 4px 8px;
		border: 2px solid var(--orange);
		border-radius: 4px;
		background: var(--yellow);
		color: var(--orange);
		font-size: 0.9em;
		font-weight: 500;
		cursor: pointer;
		transition: 0.2s;
		font-family: inherit;
	}

	.form-actions button:hover:not(:disabled) {
		background: var(--orange);
		color: white;
	}

	.form-actions button:disabled {
		background: #ccc;
		border-color: #ccc;
		color: #999;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.form-actions button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Section styling */
	.section {
		margin-bottom: 32px;
		padding-bottom: 24px;
		border-bottom: 2px solid rgba(247, 200, 129, 0.3);
	}

	.section:last-child {
		border-bottom: none;
		margin-bottom: 0;
	}

	.section h4 {
		margin: 0 0 20px 0;
		color: #2c3e50;
		font-size: 18px;
		font-weight: 600;
	}

	.secret-warning {
		background-color: #fff3cd;
		border: 2px solid #ffc107;
		border-radius: 6px;
		padding: 12px;
		margin-bottom: 12px;
	}

	.secret-warning p {
		margin: 0 0 12px 0;
		color: #856404;
		font-size: 0.9em;
		line-height: 1.4;
	}

	.secret-reveal-prompt,
	.secret-revealed {
		padding: 12px;
		border: 2px solid #f7c881;
		border-radius: 6px;
		background-color: #fdfaf0;
	}

	.secret-preview {
		margin-bottom: 12px;
		padding-bottom: 12px;
		border-bottom: 1px solid rgba(247, 200, 129, 0.5);
	}

	.secret-display {
		background-color: white;
		border: 1px solid #e0e0e0;
		border-radius: 4px;
		padding: 10px;
		font-family: 'Monaco', 'Courier New', monospace;
		font-size: 0.85em;
		word-break: break-all;
		color: #2c3e50;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.secret-display.masked {
		background-color: #f0f0f0;
		font-weight: 600;
		letter-spacing: 1px;
	}

	.secret-display.full {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.secret-display code {
		flex: 1;
		word-break: break-all;
	}

	.btn-reveal,
	.btn-copy,
	.btn-hide {
		padding: 8px 16px;
		border: 2px solid var(--orange);
		border-radius: 4px;
		background: var(--yellow);
		color: var(--orange);
		font-size: 0.85em;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		font-family: inherit;
		white-space: nowrap;
	}

	.btn-reveal:hover:not(:disabled),
	.btn-hide:hover:not(:disabled) {
		background: var(--orange);
		color: white;
		transform: translateY(-1px);
	}

	.btn-reveal:active:not(:disabled),
	.btn-hide:active:not(:disabled) {
		transform: translateY(0);
	}

	.btn-reveal.primary {
		display: inline-block;
		margin-top: 8px;
	}

	.btn-reveal:disabled {
		background: #ccc;
		border-color: #ccc;
		color: #999;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.btn-copy {
		background: transparent;
		border: none;
		padding: 4px 8px;
		font-size: 1.2em;
		cursor: pointer;
		transition: transform 0.2s ease;
	}

	.btn-copy:hover {
		transform: scale(1.2);
	}

	.btn-copy:active {
		transform: scale(0.95);
	}

	.btn-hide {
		display: block;
		margin-top: 12px;
	}

	.error-text {
		color: #c00;
		font-size: 0.85em;
		margin: 8px 0 0 0;
		padding: 8px;
		background: #fee;
		border-radius: 4px;
		border-left: 3px solid #c00;
	}

	.success-text {
		color: #28a745;
		font-size: 0.85em;
		margin: 8px 0 0 0;
		padding: 8px;
		background: #f0f9f7;
		border-radius: 4px;
		border-left: 3px solid #28a745;
	}
</style>
