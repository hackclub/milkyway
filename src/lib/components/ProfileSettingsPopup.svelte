<script lang="ts">
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
  
  // Address form state
  let address = $state({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: '',
    zipcode: '',
    phone: ''
  });
  let addressError = $state('');
  let addressSuccess = $state('');

  // Identity verification state
  let isVerifying = $state(false);
  let verificationError = $state('');
  let verificationSuccess = $state('');
  let isVerified = $state(false);

  // Load address data when popup opens
  async function loadAddress() {
    try {
      const response = await fetch('/api/address');
      const result = await response.json();
      
      if (result.success && result.address) {
        address = {
          addressLine1: result.address.addressLine1 || '',
          addressLine2: result.address.addressLine2 || '',
          city: result.address.city || '',
          state: result.address.state || '',
          country: result.address.country || '',
          zipcode: result.address.zipcode || '',
          phone: result.address.phone || ''
        };
      }
    } catch (error) {
      console.error('Failed to load address:', error);
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
          'Content-Type': 'application/json',
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

  // Handle address form submission
  async function handleAddressSubmit() {
    if (isSubmitting) return;
    
    isSubmitting = true;
    addressError = '';
    addressSuccess = '';

    try {
      const response = await fetch('/api/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(address)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save address');
      }

      addressSuccess = 'Address saved successfully!';
      
      // Update address with returned data
      if (result.address) {
        address = {
          addressLine1: result.address.addressLine1 || '',
          addressLine2: result.address.addressLine2 || '',
          city: result.address.city || '',
          state: result.address.state || '',
          country: result.address.country || '',
          zipcode: result.address.zipcode || '',
          phone: result.address.phone || ''
        };
      }
      
      // Notify parent component that user data has been updated
      onUserUpdate();

    } catch (error) {
      addressError = error instanceof Error ? error.message : 'An unexpected error occurred';
    } finally {
      isSubmitting = false;
    }
  }

  // Handle escape key
  function handleKeydown(event: KeyboardEvent) {
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
    addressError = '';
    addressSuccess = '';
    // Reset address fields to ensure fresh data is loaded next time
    address = {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      country: '',
      zipcode: '',
      phone: ''
    };
    onClose();
  }

  // Load identity verification status
  async function loadVerificationStatus() {
    try {
      const response = await fetch('/api/verify-identity');
      const result = await response.json();
      
      if (result.success) {
        isVerified = result.isVerified;
      }
    } catch (error) {
      console.error('Failed to load verification status:', error);
    }
  }

  // Handle identity verification
  async function handleIdentityVerification() {
    if (isVerifying) return;
    
    isVerifying = true;
    verificationError = '';
    verificationSuccess = '';
    
    try {
      // Import the SubmitAuthorizer class
      const { SubmitAuthorizer } = await import('./SubmitAuthorizer.js');
      
      // Create authorizer instance (no API key needed since we use proxy routes)
      const authorizer = new SubmitAuthorizer();
      
      // Start verification process
      const result = await authorizer.authorize();
      
      // Save the verification result
      const saveResponse = await fetch('/api/verify-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'save_verification',
          idvRec: result.idvRec
        })
      });
      
      const saveResult = await saveResponse.json();
      
      if (saveResult.success) {
        verificationSuccess = 'Identity verification completed successfully!';
        isVerified = true;
        // Don't close the popup - let user see their updated status
        // Just refresh the verification status
        await loadVerificationStatus();
      } else {
        verificationError = saveResult.error?.message || 'Failed to save verification';
      }
      
    } catch (error) {
      console.error('Identity verification error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage === 'Authorization cancelled by user') {
        verificationError = 'Verification was cancelled';
      } else {
        verificationError = errorMessage || 'Identity verification failed';
      }
    } finally {
      isVerifying = false;
    }
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
      
      // Load address data
      loadAddress();
      
      // Load verification status
      loadVerificationStatus();
    }
  });
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showPopup}
  <div class="popup-overlay" onclick={handleClose} role="dialog" aria-modal="true" aria-labelledby="profile-settings-title" tabindex="0">
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

        <!-- Address Section -->
        <div class="section">
          <h4>Address</h4>
          
          <!-- Address -->
          <div class="form-group">
            <label for="address-line1-field">Address</label>
            <input 
              type="text" 
              id="address-line1-field"
              bind:value={address.addressLine1}
              placeholder="Street address"
              disabled={isSubmitting}
            />
          </div>

          <!-- Address Line 2 -->
          <div class="form-group">
            <label for="address-line2-field">Address Line 2</label>
            <input 
              type="text" 
              id="address-line2-field"
              bind:value={address.addressLine2}
              placeholder="Apartment, suite, etc. (optional)"
              disabled={isSubmitting}
            />
          </div>

          <!-- City, State, Country, ZIP in a compact layout -->
          <div class="address-row">
            <div class="form-group">
              <label for="city-field">City</label>
              <input 
                type="text" 
                id="city-field"
                bind:value={address.city}
                placeholder="City"
                disabled={isSubmitting}
              />
            </div>

            <div class="form-group">
              <label for="state-field">State</label>
              <input 
                type="text" 
                id="state-field"
                bind:value={address.state}
                placeholder="State"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div class="address-row">
            <div class="form-group">
              <label for="country-field">Country</label>
              <input 
                type="text" 
                id="country-field"
                bind:value={address.country}
                placeholder="Country"
                disabled={isSubmitting}
              />
            </div>

            <div class="form-group">
              <label for="zipcode-field">ZIP Code</label>
              <input 
                type="text" 
                id="zipcode-field"
                bind:value={address.zipcode}
                placeholder="ZIP Code"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <!-- Phone -->
          <div class="form-group">
            <label for="phone-field">Phone</label>
            <input 
              type="tel" 
              id="phone-field"
              bind:value={address.phone}
              placeholder="Phone number"
              disabled={isSubmitting}
            />
          </div>

          {#if addressError}
            <div class="error-message">
              {addressError}
            </div>
          {/if}

          {#if addressSuccess}
            <div class="success-message">
              {addressSuccess}
            </div>
          {/if}

          <div class="form-actions">
            <button type="button" onclick={handleAddressSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save address'}
            </button>
          </div>
        </div>

        <!-- Identity Verification Section -->
        <div class="section">
          <h4>Identity Verification</h4>
          
          {#if isVerified}
            <div class="verification-status verified">
              <div class="status-icon">✅</div>
              <div class="status-text">
                <strong>You are verified, yay!</strong>
                <p>Your identity has been successfully verified.</p>
              </div>
            </div>
          {:else}
            <div class="verification-status not-verified">
              <div class="status-icon">⚠️</div>
              <div class="status-text">
                <strong>Identity verification required</strong>
                <p>Verify your identity to be able to ship projects and get prizes!</p>
              </div>
            </div>
            
            {#if verificationError}
              <div class="error-message">
                {verificationError}
              </div>
            {/if}

            {#if verificationSuccess}
              <div class="success-message">
                {verificationSuccess}
              </div>
            {/if}

            <div class="verify-actions">
              <button 
                type="button" 
                onclick={handleIdentityVerification} 
                disabled={isVerifying}
                class="verify-button"
              >
                {isVerifying ? 'Verifying...' : 'Verify Identity'}
              </button>
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
    background-color: #FBF2BF;
    border: 4px solid #F7C881;
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
    border-bottom: 3px solid #F7C881;
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
    border-bottom: 3px solid #E67E22;
  }

  .form-group input:focus {
    outline: none;
    border-bottom: 3px solid #E67E22;
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
    border-bottom: 3px solid #F7C881;
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
    border-bottom: 3px solid #E67E22;
  }

  .form-group textarea:focus {
    outline: none;
    border-bottom: 3px solid #E67E22;
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

  /* Identity Verification Styles */
  .verification-status {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .verification-status.verified {
    background-color: var(--yellow);
    border: 2px solid var(--orange);
    color: #2c3e50;
  }

  .verification-status.not-verified {
    background-color: #fff3cd;
    border: 2px solid #ffeaa7;
    color: #856404;
  }

  .status-icon {
    font-size: 1.2em;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .status-text {
    flex: 1;
  }

  .status-text strong {
    display: block;
    margin-bottom: 4px;
    font-weight: 600;
  }

  .status-text p {
    margin: 0;
    font-size: 0.9em;
    opacity: 0.8;
  }

  .verify-actions {
    display: flex;
    justify-content: center;
    margin-top: 20px;
  }

  .verify-button {
    padding: 8px 16px;
    border: 2px solid #7FA9DB;
    border-radius: 4px;
    background: #7FA9DB;
    color: white;
    font-size: 1.1em;
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s;
    font-family: inherit;
    min-width: 160px;
  }

  .verify-button:hover:not(:disabled) {
    background: #5a8bc4;
    border-color: #5a8bc4;
  }

  .verify-button:disabled {
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


  /* Address row layout */
  .address-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }



  /* Responsive adjustments */
  @media (max-width: 480px) {
    .address-row {
      grid-template-columns: 1fr;
      gap: 0;
    }
  }
</style>
