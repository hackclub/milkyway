<script>
  let { show = $bindable(false), projectId } = $props();

  /** @type {Array<{id: string, hours: number, description: string, proof: string, image: string, created: string, approvedHours: number | null, reviewNote: string, reviewedAt: string, status: 'pending' | 'approved' | 'rejected' | 'decreased', rereviewRequest: string, isRereviewRequested: boolean, isEditing?: boolean, editDescription?: string, editProof?: string, isRequestingRereview?: boolean, rereviewMessage?: string, localError?: string, isSaving?: boolean, isSendingRereview?: boolean}>} */
  let artlogs = $state([]);
  let isLoading = $state(false);
  let error = $state('');

  function closePopup() {
    show = false;
    error = '';
  }

  /**
   * @param {MouseEvent} e
   */
  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      closePopup();
    }
  }

  async function fetchArtlogs() {
    if (!projectId) {
      console.error('No projectId provided to ArtlogListPopup');
      return;
    }

    try {
      isLoading = true;
      error = '';

      const response = await fetch('/api/get-artlogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId })
      });

      const result = await response.json();

      if (!result.success) {
        error = result.error || 'Failed to fetch artlogs';
        return;
      }

      const rawArtlogs = /** @type {any[]} */ (result.artlogs || []);
      artlogs = rawArtlogs.map((/** @type {any} */ a) => ({
        ...a,
        isEditing: false,
        editDescription: a.description,
        editProof: a.proof,
        isRequestingRereview: false,
        rereviewMessage: '',
        localError: '',
        isSaving: false,
        isSendingRereview: false
      }));
    } catch (err) {
      console.error('Error fetching artlogs:', err);
      error = 'Failed to fetch artlogs. Please try again.';
    } finally {
      isLoading = false;
    }
  }

  // Fetch artlogs when popup is shown
  $effect(() => {
    if (show) {
      fetchArtlogs();
    }
  });

  /**
   * @param {string} dateString
   */
  function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * @param {any} artlog
   */
  function startEdit(artlog) {
    artlog.isEditing = true;
    artlog.editDescription = artlog.description;
    artlog.editProof = artlog.proof;
    artlog.localError = '';
  }

  /**
   * @param {any} artlog
   */
  function cancelEdit(artlog) {
    artlog.isEditing = false;
    artlog.editDescription = artlog.description;
    artlog.editProof = artlog.proof;
    artlog.localError = '';
  }

  /**
   * @param {any} artlog
   */
  async function saveEdit(artlog) {
    if (!artlog.editDescription || !artlog.editDescription.trim()) {
      artlog.localError = 'description is required';
      return;
    }

    if (!artlog.editProof || !artlog.editProof.trim()) {
      artlog.localError = 'proof URL is required';
      return;
    }

    artlog.isSaving = true;
    artlog.localError = '';

    try {
      const res = await fetch('/api/update-artlog-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artlogId: artlog.id,
          description: artlog.editDescription,
          proof: artlog.editProof
        })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        artlog.localError = result?.error?.message || result?.error || 'failed to save changes';
        return;
      }

      artlog.description = result.artlog.description;
      artlog.proof = result.artlog.proof;
      artlog.isEditing = false;
    } catch (err) {
      console.error('Error updating artlog details:', err);
      artlog.localError = 'failed to save changes. please try again.';
    } finally {
      artlog.isSaving = false;
    }
  }

  /**
   * @param {any} artlog
   */
  function openRereview(artlog) {
    artlog.isRequestingRereview = true;
    artlog.rereviewMessage = '';
    artlog.localError = '';
  }

  /**
   * @param {any} artlog
   */
  function cancelRereview(artlog) {
    artlog.isRequestingRereview = false;
    artlog.rereviewMessage = '';
    artlog.localError = '';
  }

  /**
   * @param {any} artlog
   */
  async function submitRereview(artlog) {
    if (!artlog.rereviewMessage || !artlog.rereviewMessage.trim()) {
      artlog.localError = 'please add a short explanation for your re-review request';
      return;
    }

    artlog.isSendingRereview = true;
    artlog.localError = '';

    try {
      const res = await fetch('/api/request-artlog-rereview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artlogId: artlog.id,
          message: artlog.rereviewMessage
        })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        artlog.localError = result?.error?.message || result?.error || 'failed to request re-review';
        return;
      }

      // Refresh list to reflect pending status
      await fetchArtlogs();
    } catch (err) {
      console.error('Error requesting artlog re-review:', err);
      artlog.localError = 'failed to request re-review. please try again.';
    } finally {
      artlog.isSendingRereview = false;
    }
  }
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="artlog-list-overlay" onclick={handleOverlayClick}>
    <div class="artlog-list-popup">
      <div class="popup-header">
        <h2>Past Artlogs</h2>
        <button class="close-btn" onclick={closePopup}>×</button>
      </div>

      <div class="popup-content">
        {#if isLoading}
          <div class="loading">Loading artlogs...</div>
        {:else if error}
          <div class="error-message">{error}</div>
        {:else if artlogs.length === 0}
          <div class="empty-state">
            <p>No artlogs yet!</p>
            <p class="empty-hint">Create your first artlog to track your art hours.</p>
          </div>
        {:else}
          <div class="artlogs-list">
            {#each artlogs as artlog}
              <div class="artlog-item">
                <div class="artlog-content">
                  <div class="artlog-info">
                    <p class="artlog-date">{formatDate(artlog.created)}</p>
                    <p class="artlog-hours">{artlog.hours} hours</p>
                    <p class="artlog-status">
                      {#if artlog.status === 'pending'}
                        pending review{#if artlog.isRereviewRequested} (re-review requested){/if}
                      {:else if artlog.status === 'approved'}
                        approved
                      {:else if artlog.status === 'rejected'}
                        rejected
                      {:else if artlog.status === 'decreased'}
                        decreased (approved {artlog.approvedHours} hours)
                      {/if}
                    </p>
                    <p class="artlog-description">{artlog.description}</p>
                    {#if artlog.reviewNote && artlog.status !== 'pending'}
                      <p class="artlog-review-note"><strong>reviewer note:</strong> {artlog.reviewNote}</p>
                    {/if}
                    {#if artlog.proof}
                      <a href={artlog.proof} target="_blank" rel="noopener noreferrer" class="artlog-proof">
                        View proof →
                      </a>
                    {/if}

                    <!-- Edit controls for pending artlogs -->
                    {#if artlog.status === 'pending'}
                      {#if !artlog.isEditing}
                        <button class="artlog-action-btn" onclick={() => startEdit(artlog)}>
                          Edit details
                        </button>
                      {:else}
                        <div class="artlog-edit-block">
                          <label>
                            description
                            <textarea
                              rows="3"
                              bind:value={artlog.editDescription}
                            ></textarea>
                          </label>
                          <label>
                            proof URL
                            <input
                              type="url"
                              bind:value={artlog.editProof}
                            />
                          </label>
                          <div class="artlog-edit-buttons">
                            <button
                              class="artlog-action-btn secondary"
                              onclick={() => cancelEdit(artlog)}
                              disabled={artlog.isSaving}
                            >
                              Cancel
                            </button>
                            <button
                              class="artlog-action-btn primary"
                              onclick={() => saveEdit(artlog)}
                              disabled={artlog.isSaving}
                            >
                              {artlog.isSaving ? 'Saving…' : 'Save changes'}
                            </button>
                          </div>
                        </div>
                      {/if}
                    {/if}

                    <!-- Re-review controls for rejected / decreased artlogs -->
                    {#if artlog.status === 'rejected' || artlog.status === 'decreased'}
                      {#if !artlog.isRequestingRereview}
                        <button class="artlog-action-btn" onclick={() => openRereview(artlog)}>
                          Request re-review
                        </button>
                      {:else}
                        <div class="artlog-edit-block">
                          <label>
                            explain why you'd like a re-review
                            <textarea
                              rows="3"
                              bind:value={artlog.rereviewMessage}
                            ></textarea>
                          </label>
                          <div class="artlog-edit-buttons">
                            <button
                              class="artlog-action-btn secondary"
                              onclick={() => cancelRereview(artlog)}
                              disabled={artlog.isSendingRereview}
                            >
                              Cancel
                            </button>
                            <button
                              class="artlog-action-btn primary"
                              onclick={() => submitRereview(artlog)}
                              disabled={artlog.isSendingRereview}
                            >
                              {artlog.isSendingRereview ? 'Sending…' : 'Submit request'}
                            </button>
                          </div>
                        </div>
                      {/if}
                    {/if}

                    {#if artlog.localError}
                      <div class="error-message small">{artlog.localError}</div>
                    {/if}
                  </div>
                  {#if artlog.image}
                    <div class="artlog-image">
                      <img src={artlog.image} alt="Artlog screenshot" />
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
          <div class="artlogs-summary">
            Total art hours: <strong>{artlogs.reduce((sum, log) => sum + (log.hours || 0), 0)}</strong>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
.artlog-list-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.artlog-list-popup {
  background: var(--yellow);
  border: 4px solid var(--orange);
  border-radius: 12px;
  max-width: 700px;
  width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 2px solid var(--orange);
}

.popup-header h2 {
  margin: 0;
  color: var(--orange);
  font-size: 1em;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2em;
  color: var(--orange);
  cursor: pointer;
  line-height: 0.8;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.close-btn:hover {
  transform: scale(1.2);
}

.popup-content {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
  font-style: italic;
}

.error-message {
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid #dc3545;
  color: #dc3545;
  padding: 12px 16px;
  border-radius: 4px;
  text-align: center;
}

.error-message.small {
  margin-top: 8px;
  font-size: 0.8em;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.empty-state p {
  margin: 8px 0;
}

.empty-hint {
  font-size: 0.9em;
  font-style: italic;
}

.artlogs-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.artlog-item {
  background: rgba(255, 255, 255, 0.6);
  border: 2px solid var(--orange);
  border-radius: 8px;
  padding: 16px;
}

.artlog-content {
  display: flex;
  gap: 16px;
}

.artlog-info {
  flex: 1;
}

.artlog-info p {
  margin: 6px 0;
}

.artlog-hours {
  font-weight: bold;
  color: var(--orange);
  font-size: 1em;
}

.artlog-status {
  font-size: 0.9em;
  color: #555;
  font-style: italic;
}

.artlog-date {
  font-size: 1em;
  color: #666;
}

.artlog-description {
  margin: 8px 0;
  color: #333;
  line-height: 1.4;
  white-space: pre-wrap;
  font-size: 1em;
}

.artlog-review-note {
  margin: 4px 0 0 0;
  font-size: 0.9em;
  color: #444;
}

.artlog-proof {
  display: inline-block;
  margin-top: 8px;
  color: var(--orange);
  text-decoration: none;
  font-size: 1em;
  font-weight: 500;
  transition: opacity 0.2s;
}

.artlog-proof:hover {
  opacity: 0.7;
  text-decoration: underline;
}

.artlog-image {
  width: 200px;
  height: 200px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--orange);
}

.artlog-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.artlog-action-btn {
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 2px solid var(--orange);
  background: #fff7e0;
  color: #b25b00;
  font-size: 0.85em;
  font-weight: 600;
  cursor: pointer;
}

.artlog-action-btn:hover {
  background: #ffe4b3;
}

.artlog-action-btn.primary {
  background: var(--orange);
  color: #fff;
}

.artlog-action-btn.primary:hover {
  background: #e67e00;
}

.artlog-action-btn.secondary {
  background: #fff;
  color: #555;
  border-color: #bbb;
}

.artlog-edit-block {
  margin-top: 10px;
  padding: 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #ddd;
}

.artlog-edit-block label {
  display: block;
  font-size: 0.85em;
  margin-bottom: 6px;
}

.artlog-edit-block textarea,
.artlog-edit-block input[type="url"] {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 0.9em;
}

.artlog-edit-buttons {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.artlogs-summary {
  margin-top: 20px;
  padding: 12px;
  background: rgba(255, 165, 0, 0.2);
  border: 2px solid var(--orange);
  border-radius: 6px;
  text-align: center;
  font-size: 1em;
  color: #333;
}

.artlogs-summary strong {
  color: var(--orange);
  font-weight: bold;
}
</style>
