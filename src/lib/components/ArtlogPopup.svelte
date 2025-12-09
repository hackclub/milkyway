<script>
  let { show = $bindable(false), projectId, onSuccess = null, codeHours = 0, artHours = 0 } = $props();

  let hours = $state('');
  let description = $state('');
  let proof = $state('');
  let imageData = $state('');
  let isSubmitting = $state(false);
  let isUploadingImage = $state(false);
  let error = $state('');

  // Calculate max art hours allowed (30% of total project hours)
  // If art can be max 30% of total, and code is fixed, then:
  // artMax / (code + artMax) = 0.30
  // artMax = 0.30 * code + 0.30 * artMax
  // 0.70 * artMax = 0.30 * code
  // artMax = (0.30 / 0.70) * code
  let maxArtHours = $derived(() => {
    return Math.floor((codeHours * 0.3 / 0.7) * 100) / 100;
  });
  
  let remainingArtHours = $derived(() => {
    return Math.max(0, Math.floor((maxArtHours() - artHours) * 100) / 100);
  });

  // Check if all fields are filled and hours is within cap
  let isFormValid = $derived(
    hours !== '' && parseFloat(hours) > 0 &&
    parseFloat(hours) <= remainingArtHours() &&
    description.trim() !== '' && 
    proof.trim() !== '' && 
    imageData !== ''
  );

  function closePopup() {
    show = false;
    hours = '';
    description = '';
    proof = '';
    imageData = '';
    error = '';
  }

  /**
   * @param {Event} event
   */
  function handleImageSelect(event) {
    const target = /** @type {HTMLInputElement} */ (event.target);
    const file = target.files?.[0];
    if (!file) {
      isUploadingImage = false;
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      error = 'Please select an image file';
      isUploadingImage = false;
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      error = 'Image file is too large. Please select an image smaller than 5MB.';
      isUploadingImage = false;
      return;
    }

    isUploadingImage = true;
    error = '';

    // Convert to base64
    const reader = new FileReader();
    reader.onload = function(e) {
      const base64String = e.target?.result;
      if (base64String && typeof base64String === 'string') {
        imageData = base64String;
      } else {
        error = 'Failed to read image';
      }
      isUploadingImage = false;
    };
    reader.onerror = function() {
      error = 'Error reading image file';
      isUploadingImage = false;
    };
    reader.readAsDataURL(file);
  }

  function selectImage() {
    const fileInput = document.getElementById('artlog-image-input');
    if (fileInput) {
      fileInput.click();
    }
  }

  async function submitArtlog() {
    if (!hours || !description || !proof || !imageData) {
      error = 'All fields are required (including screenshot)';
      return;
    }

    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      error = 'Hours must be a positive number';
      return;
    }
    
    // Check 30% cap
    if (hoursNum > remainingArtHours()) {
      error = `You can only log up to ${remainingArtHours()} more art hours (30% cap)`;
      return;
    }

    if (!proof.startsWith('http://') && !proof.startsWith('https://')) {
      error = 'Proof must be a valid URL (starting with http:// or https://)';
      return;
    }

    try {
      isSubmitting = true;
      error = '';

      const response = await fetch('/api/create-artlog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          hours: hoursNum,
          description: description.trim(),
          proof: proof.trim(),
          imageData: imageData || null
        })
      });

      const result = await response.json();

      if (!result.success) {
        error = result.error || 'Failed to create artlog';
        return;
      }

      const submittedHours = hoursNum;
      closePopup();
      
      if (onSuccess) {
        onSuccess(submittedHours);
      }
    } catch (err) {
      console.error('Error submitting artlog:', err);
      error = 'Failed to create artlog. Please try again.';
    } finally {
      isSubmitting = false;
    }
  }

  /**
   * @param {MouseEvent} e
   */
  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      closePopup();
    }
  }
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="artlog-overlay" onclick={handleOverlayClick}>
    <div class="artlog-popup">
      <h2>Create Artlog</h2>
      
      <div class="form-content">
        <div class="form-left">

          <div class="form-group">
            <label for="description">What did you make?</label>
            <textarea
              id="description"
              bind:value={description}
              rows="4"
              placeholder="A character spritesheet, a 3d model of a tree..."
              disabled={isSubmitting}
            ></textarea>
          </div>


          <div class="form-group">
            <label for="hours">How many hours did you spend making this?</label>
            <input
              type="number"
              id="hours"
              bind:value={hours}
              step="0.1"
              min="0.1"
              max={remainingArtHours()}
              placeholder="1.5"
              disabled={isSubmitting}
            />
            <div class="hours-cap-info">
              Art hours can be up to 30% of total project hours.
              <br>
              You can log up to <strong>{remainingArtHours()}</strong> more art hours.
            </div>
          </div>

          <div class="form-group">
            <label for="proof">Link to proof</label>
            <input
              type="url"
              id="proof"
              bind:value={proof}
              placeholder="https://..."
              disabled={isSubmitting}
            />
            <div class="proof-hint">
              Proof such as - timelapse of drawing, screenshot of how much time spent at the end. Upload via a file host or #cdn in slack!
            </div>
          </div>
        </div>

        <div class="form-right">
          <div class="form-group">
            <label for="image">A screenshot of what you made!</label>
            <input
              id="artlog-image-input"
              type="file"
              accept="image/*"
              onchange={handleImageSelect}
              style="display: none;"
            />
            <button 
              type="button"
              class="image-upload-btn" 
              onclick={selectImage} 
              disabled={isSubmitting || isUploadingImage}
            >
              {#if isUploadingImage}
                Loading image...
              {:else if imageData}
                ✓ Image selected - Click to change
              {:else}
                Choose image
              {/if}
            </button>
            {#if imageData}
              <div class="image-preview">
                <img src={imageData} alt="Preview" />
              </div>
            {/if}
          </div>
          <div class="proof-hint">
            Misrepresenting the hours spent on assets may result in a reduction of coins, removal of prizes, or even a ban from Milkyway.

          </div>
        </div>
      </div>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <div class="button-group">
        <button class="cancel-btn" onclick={closePopup} disabled={isSubmitting}>
          Cancel
        </button>
        <button class="submit-btn" onclick={submitArtlog} disabled={isSubmitting || !isFormValid}>
          {isSubmitting ? 'Creating...' : 'Create Artlog'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
.artlog-overlay {
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

.artlog-popup {
  background: var(--yellow);
  border: 4px solid var(--orange);
  border-radius: 8px;
  padding: 24px;
  max-width: 800px;
  width: 90%;
}

.artlog-popup h2 {
  margin: 0 0 20px 0;
  color: var(--orange);
  font-size: 1.4em;
}

.form-content {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.form-left {
  flex: 1;
}

.form-right {
  flex: 1;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  color: #333;
  font-weight: bold;
  font-size: 0.9em;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid var(--orange);
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9em;
  background: white;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #e67e00;
}

.form-group textarea {
  resize: vertical;
}

.proof-hint {
  margin-top: 4px;
  font-size: 0.75em;
  color: #666;
  font-style: italic;
}

.error-message {
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid #dc3545;
  color: #dc3545;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 0.85em;
}

.button-group {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.cancel-btn,
.submit-btn {
  padding: 8px 16px;
  border: 2px solid;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9em;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: var(--yellow);
  border-color: var(--orange);
  color: var(--orange);
}

.cancel-btn:hover:not(:disabled) {
  background: var(--orange);
  color: white;
}

.submit-btn {
  background: var(--orange);
  border-color: var(--orange);
  color: white;
}

.submit-btn:hover:not(:disabled) {
  background: #e67e00;
  border-color: #e67e00;
}

.cancel-btn:disabled,
.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #ccc !important;
  border-color: #999 !important;
  color: #666 !important;
}

.image-upload-btn {
  width: 100%;
  padding: 8px 12px;
  border: 2px dashed var(--orange);
  border-radius: 4px;
  background: rgba(255, 165, 0, 0.05);
  color: var(--orange);
  font-family: inherit;
  font-size: 0.9em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.image-upload-btn:hover:not(:disabled) {
  background: rgba(255, 165, 0, 0.1);
  border-color: #e67e00;
}

.image-upload-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.image-preview {
  margin-top: 8px;
  border-radius: 4px;
  overflow: hidden;
  border: 2px solid var(--orange);
  max-height: 30vh;
  
}

.image-preview img {
  width: 100%;
  height: 30vh;
  object-fit: contain;
  display: block;
}

.hours-cap-info {
  margin-top: 6px;
  font-size: 0.75em;
  color: #666;
  line-height: 1.4;
}

.hours-cap-info strong {
  color: var(--orange);
}
</style>
