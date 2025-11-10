<script>
	let { data, mode, id, roomOwner, currentUser } = $props();

	let noteData = $state(
		data ? JSON.parse(data) : { message: '', author: '', authorUsername: '', timestamp: Date.now() }
	);
	let isEditing = $state(mode === 'edit');
	let message = $derived(noteData.message || '');
	let isSaving = $state(false);
	let saveStatus = $state('');

	const canEdit = $derived(currentUser && currentUser.recId === noteData.author);
	const canDelete = $derived(
		currentUser && (currentUser.recId === noteData.author || currentUser.recId === roomOwner)
	);

	function reloadPage() {
		if (typeof window !== 'undefined') {
			const url = new URL(window.location.href);
			if (!url.searchParams.has('skipNotification')) {
				url.searchParams.set('skipNotification', 'true');
				window.location.href = url.toString();
			} else {
				location.reload();
			}
		}
	}

	async function saveNote() {
		if (!message.trim()) {
			alert('Please write a message!');
			return;
		}

		isSaving = true;
		saveStatus = 'Saving your note...';
		try {
			const updatedData = {
				message: message.trim(),
				author: currentUser?.recId || noteData.author,
				authorUsername: currentUser?.username || noteData.authorUsername,
				timestamp: Date.now()
			};

			const response = await fetch('/api/furniture', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					furnitureId: id,
					updates: { data: JSON.stringify(updatedData) }
				})
			});

			const result = await response.json();

			if (result.success) {
				noteData = updatedData;
				isEditing = false;
				saveStatus = 'Saved! Refreshing page...';
				// Small delay to show the success message
				setTimeout(() => {
					reloadPage();
				}, 500);
			} else {
				console.error('Failed to save sticky note:', result.error);
				isSaving = false;
				saveStatus = '';
				alert(`Failed to save sticky note: ${result.error || 'Please try again.'}`);
			}
		} catch (error) {
			console.error('Error saving sticky note:', error);
			isSaving = false;
			saveStatus = '';
			alert('Error saving sticky note. Please try again.');
		}
	}

	async function deleteNote() {
		if (!confirm('Are you sure you want to delete this sticky note?')) {
			return;
		}

		try {
			const response = await fetch('/api/furniture', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					furnitureId: id
				})
			});

			const result = await response.json();

			if (result.success) {
				reloadPage();
			} else {
				console.error('Failed to delete sticky note:', result.error);
				alert('Failed to delete sticky note. Please try again.');
			}
		} catch (error) {
			console.error('Error deleting sticky note:', error);
			alert('Error deleting sticky note. Please try again.');
		}
	}

	/**
	 * @param {number} timestamp
	 */
	function formatDate(timestamp) {
		const date = new Date(timestamp);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	async function handleCancel() {
		if (!noteData.message || !noteData.message.trim()) {
			await deleteNoteQuietly();
		} else {
			isEditing = false;
		}
	}

	async function deleteNoteQuietly() {
		try {
			const response = await fetch('/api/furniture', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					furnitureId: id
				})
			});

			const result = await response.json();

			if (result.success) {
				reloadPage();
			} else {
				console.error('Failed to delete empty sticky note:', result.error);
				isEditing = false;
			}
		} catch (error) {
			console.error('Error deleting empty sticky note:', error);
			isEditing = false;
		}
	}
</script>

<div class="sticky-note-container">
	{#if isSaving}
		<div class="saving-overlay">
			<div class="saving-spinner">⏳</div>
			<div class="saving-message">{saveStatus}</div>
		</div>
	{/if}
	
	{#if isEditing}
		<div class="sticky-note-edit">
			<h3>Write your message!!</h3>
			<textarea bind:value={message} placeholder="Leave a message..." maxlength="200" rows="5"
			></textarea>
			<div class="char-count">{message.length}/200</div>
			<div class="edit-buttons">
				<button class="cancel-btn" onclick={handleCancel} disabled={isSaving}> Cancel </button>
				<button class="save-btn" onclick={saveNote} disabled={isSaving}>
					Save Note
				</button>
			</div>
		</div>
	{:else}
		<div class="sticky-note-view">
			{#if noteData.message}
				<div class="note-content">
					<p class="note-message">{noteData.message}</p>
					<div class="note-meta">
						<span class="note-author">— {noteData.authorUsername || 'Anonymous'}</span>
						<span class="note-date">{formatDate(noteData.timestamp)}</span>
					</div>
				</div>
				{#if canDelete}
					<div class="note-actions">
						{#if canEdit}
							<button class="edit-note-btn" onclick={() => (isEditing = true)}>Edit</button>
						{/if}
						<button class="delete-note-btn" onclick={deleteNote}>Delete</button>
					</div>
				{/if}
			{:else}
				<div class="empty-note">
					<p>This sticky note is empty.</p>
					{#if canEdit}
						<button onclick={() => (isEditing = true)}>Write a message</button>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.sticky-note-container {
		position: relative;
		background: linear-gradient(135deg, #fef9c7 0%, #fef1a8 100%);
		border: 3px solid #f7c881;
		border-radius: 4px;
		padding: 20px;
		min-width: 300px;
		max-width: 400px;
		box-shadow: 3px 3px 8px rgba(0, 0, 0, 0.2);
		font-family: 'Futura', sans-serif;
	}

	.saving-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(254, 249, 199, 0.95);
		backdrop-filter: blur(2px);
		border-radius: 4px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 15px;
		z-index: 1000;
		pointer-events: all;
	}

	.saving-spinner {
		font-size: 48px;
		animation: spin 2s linear infinite;
	}

	.saving-message {
		font-size: 1.2rem;
		font-weight: bold;
		color: #333;
		text-align: center;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.sticky-note-edit h3 {
		margin: 0 0 15px 0;
		font-size: 1.3rem;
		color: #333;
	}

	textarea {
		width: 100%;
		padding: 10px;
		border: 2px solid #f7c881;
		border-radius: 4px;
		font-family: 'Futura', sans-serif;
		font-size: 1rem;
		resize: vertical;
		background: white;
		box-sizing: border-box;
	}

	.char-count {
		text-align: right;
		font-size: 0.9rem;
		color: #666;
		margin-top: 5px;
	}

	.edit-buttons {
		display: flex;
		gap: 10px;
		margin-top: 15px;
		justify-content: flex-end;
	}

	.cancel-btn,
	.save-btn,
	.edit-note-btn,
	.delete-note-btn {
		padding: 8px 16px;
		border: 2px solid #f7c881;
		border-radius: 4px;
		font-family: 'Futura', sans-serif;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.cancel-btn {
		background: white;
		color: #333;
	}

	.cancel-btn:hover {
		background: #f5f5f5;
	}

	.save-btn {
		background: #f7c881;
		color: #333;
		font-weight: bold;
	}

	.save-btn:hover {
		background: #f5b84d;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.sticky-note-view {
		min-height: 100px;
	}

	.note-content {
		margin-bottom: 15px;
	}

	.note-message {
		margin: 0 0 10px 0;
		font-size: 1.1rem;
		line-height: 1.5;
		white-space: pre-wrap;
		word-wrap: break-word;
		color: #333;
	}

	.note-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.9rem;
		color: #666;
		border-top: 1px solid #f7c881;
		padding-top: 10px;
	}

	.note-author {
		font-style: italic;
	}

	.note-date {
		font-size: 0.85rem;
	}

	.note-actions {
		display: flex;
		gap: 10px;
		justify-content: flex-end;
		margin-top: 10px;
		padding-top: 10px;
		border-top: 1px solid #f7c881;
	}

	.edit-note-btn,
	.delete-note-btn {
		padding: 6px 12px;
		font-size: 0.9rem;
	}

	.edit-note-btn {
		background: white;
		color: #333;
	}

	.edit-note-btn:hover {
		background: #f5f5f5;
	}

	.delete-note-btn {
		background: #ff6b6b;
		color: white;
		border-color: #ff5252;
	}

	.delete-note-btn:hover {
		background: #ff5252;
	}

	.empty-note {
		text-align: center;
		color: #888;
		padding: 20px 0;
	}

	.empty-note p {
		margin: 0 0 15px 0;
	}

	.empty-note button {
		background: #f7c881;
		color: #333;
		border: 2px solid #f7c881;
		border-radius: 4px;
		padding: 8px 16px;
		font-family: 'Futura', sans-serif;
		font-size: 1rem;
		cursor: pointer;
		font-weight: bold;
	}

	.empty-note button:hover {
		background: #f5b84d;
	}
</style>
