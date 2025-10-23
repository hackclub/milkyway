<script>
  let { show = $bindable(false), projectId } = $props();

  /** @type {Array<{id: string, hours: number, description: string, proof: string, image: string, created: string}>} */
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

      console.log('Fetching artlogs for project:', projectId);

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

      artlogs = result.artlogs || [];
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
                    <p class="artlog-description">{artlog.description}</p>
                    {#if artlog.proof}
                      <a href={artlog.proof} target="_blank" rel="noopener noreferrer" class="artlog-proof">
                        View proof →
                      </a>
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
