<script>
	/**
	 * @typedef {Object} ReportModalProps
	 * @property {string} targetUserId - The user ID being reported
	 * @property {string} targetUsername - The username being reported
	 * @property {() => void} onClose - Callback when modal is closed
	 */

	/** @type {ReportModalProps} */
	let { targetUserId, targetUsername, onClose } = $props();

	let description = $state('');
	let submitting = $state(false);
	let error = $state('');
	let success = $state(false);

	const reasons = [
		{ value: 'inappropriate_content', label: 'Inappropriate Content' },
		{ value: 'offensive_language', label: 'Offensive Language' },
		{ value: 'harassment', label: 'Harassment or Bullying' },
		{ value: 'other', label: 'Other' }
	];

	async function handleSubmit() {
		error = '';

		// Validation
		if (!description.trim()) {
			error = 'please provide a description';
			return;
		}

		if (description.trim().length < 10) {
			error = 'description must be at least 10 characters';
			return;
		}

		if (description.trim().length > 300) {
			error = 'description must be less than 300 characters';
			return;
		}

		submitting = true;

		try {
			const response = await fetch('/api/report-user', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					targetUserId,
					description: description.trim()
				})
			});

			const result = await response.json();

			if (response.ok) {
				success = true;
				setTimeout(() => {
					onClose();
				}, 2000);
			} else {
				error = result.error || 'Failed to submit report';
			}
		} catch (err) {
			console.error('Error submitting report:', err);
			error = 'Failed to submit report. Please try again.';
		} finally {
			submitting = false;
		}
	}

	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

<div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
	<div class="modal-content" role="dialog" aria-labelledby="report-title" aria-modal="true">
		{#if success}
			<div class="success-message">
				<div class="success-icon">✓</div>
				<h2>Report Submitted</h2>
			</div>
		{:else}
			<h2 id="report-title">Report {targetUsername}'s Room</h2>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
			>
				<div class="form-group">
					<label for="description">Description *</label>
					<textarea
						id="description"
						bind:value={description}
						placeholder="describe the issue here..."
						rows="6"
						maxlength="300"
						disabled={submitting}
						required
					></textarea>
					<div class="char-count" class:warning={description.length > 250}>
						{description.length} / 300
					</div>
				</div>

				{#if error}
					<div class="error-message">{error}</div>
				{/if}

				<div class="button-group">
					<button type="button" class="cancel-button" onclick={onClose} disabled={submitting}>
						Cancel
					</button>
					<button type="submit" class="submit-button" disabled={submitting}>
						{submitting ? 'Submitting...' : 'Submit'}
					</button>
				</div>
			</form>
		{/if}
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.7);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
		padding: 20px;
		box-sizing: border-box;
	}

	.modal-content {
		background: #fbf2bf;
		border-radius: 4px;
		border: 3px solid #f7c881;
		padding: 30px;
		max-width: 500px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}

	h2 {
		margin: 0 0 10px 0;
		color: #333;
		font-size: 1.5em;
	}

	.form-group {
		margin-bottom: 20px;
	}

	label {
		display: block;
		margin-bottom: 8px;
		font-weight: 600;
		color: #333;
		font-size: 0.95em;
	}

	textarea {
		width: 100%;
		padding: 10px;
		border: 2px solid #ddd;
		border-radius: 6px;
		font-family: inherit;
		font-size: 0.95em;
		box-sizing: border-box;
		transition: border-color 0.2s;
	}

	textarea:focus {
		outline: none;
		border-color: #4caf50;
	}

	textarea:disabled {
		background-color: #f5f5f5;
		cursor: not-allowed;
	}

	textarea {
		resize: vertical;
		min-height: 100px;
	}

	.char-count {
		text-align: right;
		font-size: 0.85em;
		color: #666;
		margin-top: 4px;
	}

	.char-count.warning {
		color: #ff9800;
		font-weight: 600;
	}

	.button-group {
		display: flex;
		gap: 12px;
		margin-top: 25px;
	}

	button {
		flex: 1;
		padding: 12px 20px;
		border: none;
		border-radius: 6px;
		font-family: inherit;
		font-size: 1em;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.cancel-button {
		background-color: #74b9ff;
		border: 3px solid #0984e3;
		color: white;
	}

	.cancel-button:hover:not(:disabled) {
		background-color: #4aa1ff;
	}

	.submit-button {
		background-color: #ff6b6b;
		border: 3px solid #cc5555;
		color: white;
	}

	.submit-button:hover:not(:disabled) {
		background-color: #ff5252;
	}

	.error-message {
		background-color: #ffebee;
		color: #c62828;
		padding: 12px;
		border-radius: 6px;
		margin-top: 15px;
		font-size: 0.9em;
		border-left: 4px solid #c62828;
	}

	.success-message {
		text-align: center;
		padding: 40px 20px;
	}

	.success-icon {
		width: 80px;
		height: 80px;
		background-color: #4caf50;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 3em;
		margin: 0 auto 20px;
	}

	.success-message h2 {
		color: #4caf50;
		margin-bottom: 10px;
	}
</style>
