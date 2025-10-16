/**
 * SubmitAuthorizer class for identity verification
 * Integrates with submit.hackclub.com API
 * This class is designed to run in the browser
 */
export class SubmitAuthorizer {
  constructor(apiKey, baseUrl = 'https://submit.hackclub.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async authorize() {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('SubmitAuthorizer must be used in a browser environment');
    }

    // Step 1: Create authorization request via our proxy
    const response = await fetch('/api/submit/authorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to create authorization request');
    }

    const { auth_id, popup_url } = await response.json();
    
    // Step 2: Open popup window
    const popup = window.open(
      popup_url,
      'authorization',
      'width=500,height=700,scrollbars=yes,resizable=yes'
    );

    // Step 3: Poll for completion via our proxy
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/submit/status?auth_id=${auth_id}`, {
            credentials: 'include'
          });
          
          const status = await statusResponse.json();
          
          if (status.status === 'completed') {
            clearInterval(pollInterval);
            popup.close();
            resolve({
              authId: auth_id,
              idvRec: status.idv_rec,
              completedAt: status.completed_at
            });
          }
        } catch (error) {
          clearInterval(pollInterval);
          popup.close();
          reject(error);
        }
      }, 2000); // Poll every 2 seconds

      // Handle popup closed by user
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          clearInterval(pollInterval);
          reject(new Error('Authorization cancelled by user'));
        }
      }, 1000);
    });
  }
}
