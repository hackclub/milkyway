<script lang="ts">
	import { slide, fade, scale } from 'svelte/transition';
	import confetti from 'canvas-confetti';
	import { getCreatureImageFromEgg } from '$lib/data/prompt-data.js';

	let { showPopup, onClose, projectInfo, onShip, user } = $props();

	let isShipping = $state(false);
	let shippingError = $state('');
	let currentStep = $state(1); // 1 = confirmation, 2 = questions, 3 = identity verification, 4 = hatching
	let showQuestions = $state(false);
	let showInitialContent = $state(false);
	let clickCount = $state(0);
	let isShaking = $state(false);
	let showConfetti = $state(false);
	let showCreature = $state(false);
	let isFadingOut = $state(false);
	let submitToken = $state('');
	let isVerifying = $state(false);
	let verificationError = $state('');
	let authData = $state<any>(null);
	let popupWindow = $state<Window | null>(null);
	let isCheckingStatus = $state(false);
	let isHatching = $state(false);
	let pendingHours = $state<any>(null);
	let isLoadingPendingHours = $state(false);

	// Check if this is a re-ship (project already submitted)
	let isReShip = $derived(projectInfo?.status === 'submitted');

	// Form data
	let notMadeByYou = $state('');
	let howToPlay = $state('');
	let additionalComments = $state('');

	async function handleShipProject() {
		if (!projectInfo?.id || isShipping) return;

		try {
			isShipping = true;
			shippingError = '';

			const response = await fetch('/api/ship-project', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include', // Ensure cookies are sent
				body: JSON.stringify({
					projectId: projectInfo.id,
					shipProject: true // Flag to indicate we're actually shipping the project
				})
			});

			const result = await response.json();

			if (result.success) {
				// Call the parent's ship handler
				if (onShip) {
					await onShip(projectInfo);
				}
				onClose();
			} else {
				shippingError = result.error?.message || 'Failed to ship project. Please try again.';
			}
		} catch (error) {
			console.error('Error shipping project:', error);
			shippingError = 'Network error. Please check your connection and try again.';
		} finally {
			isShipping = false;
		}
	}

	async function handleReShip() {
		if (!projectInfo?.id || isShipping) return;

		try {
			isShipping = true;
			shippingError = '';

			// Create the project submission with the identity verification token
			const submissionResponse = await fetch('/api/create-submission', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					projectEggId: projectInfo.id,
					submitToken: submitToken,
					identityData: authData
				})
			});

			const submissionResult = await submissionResponse.json();
			if (!submissionResult.success) {
				console.error('Failed to create project submission:', submissionResult.error);
				shippingError = 'Failed to create project submission. Please try again.';
				isShipping = false;
				return;
			}

			// Update project (but don't change the egg/creature image)
			const response = await fetch('/api/ship-project', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					projectId: projectInfo.id,
					reShip: true, // Flag to indicate this is a re-ship
					yswsSubmissionId: submissionResult.submissionId
				})
			});

			const result = await response.json();
			if (result.success) {
				// Show success message and close
				currentStep = 5; // New step for re-ship success

				// Wait 2 seconds then refresh the page
				setTimeout(() => {
					// Force page refresh to reload all data with new submission
					window.location.reload();
				}, 2000);
			} else {
				shippingError = result.error?.message || 'Failed to re-ship project. Please try again.';
				isShipping = false;
			}
		} catch (error) {
			console.error('Error re-shipping project:', error);
			shippingError = 'Network error. Please check your connection and try again.';
			isShipping = false;
		}
	}

	function handleClose() {
		if (!isShipping && currentStep !== 4) {
			shippingError = '';
			currentStep = 1;
			showQuestions = false;
			showInitialContent = false;
			clickCount = 0;
			isShaking = false;
			showConfetti = false;
			showCreature = false;
			isFadingOut = false;
			notMadeByYou = '';
			howToPlay = '';
			additionalComments = '';
			submitToken = '';
			isVerifying = false;
			verificationError = '';
			authData = null;
			if (popupWindow && !popupWindow.closed) {
				popupWindow.close();
			}
			popupWindow = null;
			onClose();
		}
	}

	// Validation for form fields and profile completeness
	let canProceed = $derived(() => {
		if (currentStep === 1) {
			// Step 1: Confirmation - no validation needed, just need to confirm details
			return true;
		} else if (currentStep === 2) {
			// Step 2: Questions - need form fields and profile completeness
			// Check form fields
			const formValid =
				notMadeByYou.trim() !== '' && howToPlay.trim() !== '' && additionalComments.trim() !== '';

			// Check profile completeness - be explicit about each field
			const profileValid =
				user &&
				user.username &&
				typeof user.username === 'string' &&
				user.username.trim() !== '' &&
				user.githubUsername &&
				typeof user.githubUsername === 'string' &&
				user.githubUsername.trim() !== '' &&
				user.howDidYouHear &&
				typeof user.howDidYouHear === 'string' &&
				user.howDidYouHear.trim() !== '' &&
				user.doingWell &&
				typeof user.doingWell === 'string' &&
				user.doingWell.trim() !== '' &&
				user.improve &&
				typeof user.improve === 'string' &&
				user.improve.trim() !== '';

			return formValid && profileValid;
		} else if (currentStep === 3) {
			// Step 3: Identity Verification - need submit token
			return submitToken.trim() !== '';
		} else {
			// Step 4: Hatching - no validation needed
			return true;
		}
	});

	async function handleNext() {
		if (currentStep === 1) {
			// Step 1: Confirmation -> Step 2: Questions
			currentStep = 2;
			// Trigger the questions animation
			setTimeout(() => {
				showInitialContent = true;
				setTimeout(() => {
					showQuestions = true;
				}, 600);
			}, 100);
		} else if (currentStep === 2) {
			// Step 2: Questions -> Step 3: Identity Verification
			if (canProceed()) {
				try {
					// Save form data to Airtable when proceeding to next step
					const response = await fetch('/api/ship-project', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						credentials: 'include', // Ensure cookies are sent
						body: JSON.stringify({
							projectId: projectInfo.id,
							notMadeBy: notMadeByYou.trim(),
							howToPlay: howToPlay.trim(),
							addnComments: additionalComments.trim(),
							saveFormOnly: true // Flag to indicate we're just saving form data, not shipping yet
						})
					});

					const result = await response.json();

					if (result.success) {
						currentStep = 3;
					} else {
						console.error('Failed to save form data:', result.error);
						shippingError = result.error?.message || 'Failed to save form data. Please try again.';
					}
				} catch (error) {
					console.error('Error saving form data:', error);
					shippingError = 'Network error. Please check your connection and try again.';
				}
			}
		} else if (currentStep === 3) {
			// Step 3: Identity Verification -> Step 4: Hatching (or skip for re-ship)
			if (canProceed()) {
				if (isReShip) {
					// For re-ships, skip the hatching animation and just ship directly
					await handleReShip();
				} else {
					// For first-time ships, go to hatching step
					currentStep = 4;
					clickCount = 0; // Reset click count for hatching
				}
			}
		}
	}

	function handleBack() {
		if (currentStep === 4) {
			currentStep = 3; // Go back to identity verification from hatching
		} else if (currentStep === 3) {
			currentStep = 2; // Go back to questions from identity verification
		} else if (currentStep === 2) {
			currentStep = 1; // Go back to confirmation from questions
		}
	}

	async function initiateVerification() {
		isVerifying = true;
		verificationError = '';
		authData = null;

		try {
			const response = await fetch('/api/identity-verify', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const result = await response.json();

			if (!result.success) {
				verificationError = result.error || 'Failed to initiate verification';
				return;
			}

			authData = result.data;

			// Open popup window
			const popupUrl = result.data.popup_url;
			const popupFeatures = 'width=500,height=700,scrollbars=yes,resizable=yes';
			popupWindow = window.open(popupUrl, 'identityVerification', popupFeatures);

			if (!popupWindow) {
				verificationError = 'Popup blocked. Please allow popups and try again.';
				return;
			}

			// Poll for completion
			pollForCompletion();
		} catch (error) {
			verificationError = 'Network error. Please try again.';
		} finally {
			isVerifying = false;
		}
	}

	async function pollForCompletion() {
		const pollInterval = setInterval(async () => {
			// Prevent multiple simultaneous status checks
			if (isCheckingStatus) {
				return;
			}

			try {
				isCheckingStatus = true;

				// Check if popup is closed
				if (popupWindow?.closed) {
					clearInterval(pollInterval);
					// Check status one final time
					await checkVerificationStatus();
					return;
				}

				// Check verification status
				const response = await fetch(`/api/submit/status?auth_id=${authData.auth_id}`, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json'
					}
				});

				const result = await response.json();

				if (result.status === 'completed') {
					clearInterval(pollInterval);
					popupWindow?.close();

					// Update authData with the complete result (includes identity_response)
					authData = result;

					// Set the submit token
					submitToken = authData.auth_id;
					verificationError = '';
				} else if (result.status === 'rejected') {
					clearInterval(pollInterval);
					popupWindow?.close();
					verificationError = 'Identity verification was rejected. Please try again.';
				}
			} catch (error) {
				console.error('Polling error:', error);
			} finally {
				isCheckingStatus = false;
			}
		}, 2000); // Poll every 2 seconds

		// Clear interval after 10 minutes
		setTimeout(() => {
			clearInterval(pollInterval);
			if (popupWindow && !popupWindow.closed) {
				popupWindow.close();
				verificationError = 'Verification timed out. Please try again.';
			}
		}, 600000);
	}

	async function checkVerificationStatus() {
		// Prevent duplicate status checks
		if (isCheckingStatus) {
			return;
		}

		try {
			isCheckingStatus = true;

			const response = await fetch(`/api/submit/status?auth_id=${authData.auth_id}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const result = await response.json();

			if (result.status === 'completed') {
				// Update authData with the complete result (includes identity_response)
				authData = result;

				submitToken = authData.auth_id;
				verificationError = '';
			} else if (result.status === 'rejected') {
				verificationError = 'Identity verification was rejected. Please try again.';
			} else {
				verificationError = 'Verification was not completed. Please try again.';
			}
		} catch (error) {
			verificationError = 'Failed to check verification status. Please try again.';
		} finally {
			isCheckingStatus = false;
		}
	}

	function handleEggClick() {
		if (isHatching) return; // Prevent multiple clicks during hatching

		clickCount++;
		isShaking = true;

		// Stop shaking after animation
		setTimeout(() => {
			isShaking = false;
		}, 200);

		// If we've clicked 5 times, hatch the egg
		if (clickCount >= 5) {
			hatchEgg();
		}
	}

	async function hatchEgg() {
		if (isHatching) return; // Prevent multiple executions

		isHatching = true;

		try {
			// First, create the project submission with the identity verification token
			const submissionResponse = await fetch('/api/create-submission', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					projectEggId: projectInfo.id, // Use the Airtable record ID, not projectid field
					submitToken: submitToken,
					identityData: authData // Pass the full identity verification data
				})
			});

			const submissionResult = await submissionResponse.json();
			if (!submissionResult.success) {
				console.error('Failed to create project submission:', submissionResult.error);
				shippingError = 'Failed to create project submission. Please try again.';
				return;
			}

			// Then update project to hatched state
			const response = await fetch('/api/ship-project', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					projectId: projectInfo.id,
					hatchEgg: true, // Flag to indicate we're hatching the egg
					yswsSubmissionId: submissionResult.submissionId // Pass the submission ID
				})
			});

			const result = await response.json();
			// Log pending hours conversion
			if (result.pendingHoursConverted) {
				console.log('Pending hours converted:', result.pendingHoursConverted);
			}

			if (result.success) {
				// Show creature with dramatic entrance
				showCreature = true;

				// Trigger confetti after a short delay for dramatic effect
				setTimeout(() => {
					triggerConfetti();
				}, 500);

				// Wait 3 seconds, then fade out for 1 second, then refresh
				setTimeout(() => {
					isFadingOut = true;
				}, 3000);

				setTimeout(() => {
					// Force page refresh to reload all data with new submission
					window.location.reload();
				}, 4000);
			} else {
				shippingError = result.error?.message || 'Failed to hatch egg. Please try again.';
				isHatching = false;
			}
		} catch (error) {
			console.error('Error hatching egg:', error);
			shippingError = 'Network error. Please check your connection and try again.';
			isHatching = false;
		}
	}

	// Trigger initial content fade-in
	function triggerInitialContentFadeIn() {
		setTimeout(() => {
			showInitialContent = true;
		}, 200); // Short delay to ensure popup is rendered
	}

	// Trigger questions fade-in after initial content loads
	function triggerQuestionsFadeIn() {
		setTimeout(() => {
			showQuestions = true;
		}, 1000); // Wait 1 second after initial fade-in
	}

	// Trigger confetti celebration
	function triggerConfetti() {
		// Confetti from bottom left corner
		confetti({
			particleCount: 100,
			angle: 45,
			spread: 60,
			origin: { x: 0, y: 1 },
			zIndex: 999999
		});

		// Confetti from bottom right corner
		setTimeout(() => {
			confetti({
				particleCount: 100,
				angle: 135,
				spread: 60,
				origin: { x: 1, y: 1 },
				zIndex: 999999
			});
		}, 200);

		// Additional burst from center bottom
		setTimeout(() => {
			confetti({
				particleCount: 80,
				angle: 90,
				spread: 70,
				origin: { x: 0.5, y: 1 },
				zIndex: 999999
			});
		}, 400);
	}

	// Load existing form data when popup opens
	async function loadExistingFormData() {
		if (!projectInfo?.id) return;

		try {
			const response = await fetch(`/api/projects?id=${projectInfo.id}`, {
				credentials: 'include'
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success && result.project) {
					// Load existing form data if available
					notMadeByYou = result.project.notMadeBy || '';
					howToPlay = result.project.howToPlay || '';
					additionalComments = result.project.addnComments || '';
				}
			}
		} catch (error) {
			console.error('Error loading existing form data:', error);
		}
	}

	// Load pending hours for the project
	async function loadPendingHours() {
		if (!projectInfo?.id) return;

		try {
			isLoadingPendingHours = true;
			const response = await fetch(`/api/get-pending-hours?projectId=${projectInfo.id}`, {
				credentials: 'include'
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					pendingHours = result.pendingHours;
				}
			}
		} catch (error) {
			console.error('Error loading pending hours:', error);
		} finally {
			isLoadingPendingHours = false;
		}
	}

	// Watch for popup opening and reset states
	$effect(() => {
		if (showPopup && currentStep === 1) {
			showQuestions = false;
			showInitialContent = false;

			// Load existing form data and pending hours
			loadExistingFormData();
			loadPendingHours();
		}
	});
</script>

{#if showPopup}
	<div
		class="ship-overlay"
		onclick={handleClose}
		onkeydown={(e) => e.key === 'Escape' && handleClose()}
		role="button"
		tabindex="0"
	>
		<div
			class="ship-content"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			{#if currentStep === 1}
				<!-- Step 1: Project Confirmation -->
				<h1 class="ship-title">ready to ship?</h1>
				<p class="confirmation-subtitle">review your project details...</p>

				<div class="project-confirmation-grid">
					<!-- Project Image -->
					<div class="confirmation-card image-card">
						<div class="project-image-preview">
							<img
								src={projectInfo?.projectImage || projectInfo?.image || '/pfp_placeholder.png'}
								alt="Project preview"
							/>
						</div>
					</div>

					<!-- Project Details -->
					<div class="confirmation-card details-card">
						<div class="info-grid">
							<div class="info-item">
								<span class="info-label">Name:</span>
								<span class="info-value">{projectInfo?.name || 'Untitled Project'}</span>
							</div>
							<div class="info-item">
								<span class="info-label">Description:</span>
								<span class="info-value"
									>{projectInfo?.description || 'No description provided'}</span
								>
							</div>
							<div class="info-item">
								<span class="info-label">Hours:</span>
								<span class="info-value"
									>{projectInfo?.totalHours || projectInfo?.hours || 0} hours</span
								>
							</div>
							{#if pendingHours && pendingHours.total > 0}
								<div class="info-item pending-hours-item">
									<span class="info-label">Pending Hours:</span>
									<span class="info-value pending-hours-value">
										{pendingHours.total} hrs
										<span class="hours-breakdown"
											>({pendingHours.codeHours} code, {pendingHours.artHours} art)</span
										>
									</span>
									<p class="pending-hours-note">
										these hours will count towards your tamagotchi after shipping!
									</p>
								</div>
							{/if}
							<div class="info-item">
								<span class="info-label">Ship URL:</span>
								<span class="info-value">
									{#if projectInfo?.shipURL}
										<a
											href={projectInfo.shipURL}
											target="_blank"
											rel="noopener noreferrer"
											class="url-link"
										>
											{projectInfo.shipURL}
										</a>
									{:else}
										<span class="missing-info">No ship URL provided</span>
									{/if}
								</span>
							</div>
							<div class="info-item">
								<span class="info-label">GitHub URL:</span>
								<span class="info-value">
									{#if projectInfo?.githubURL}
										<a
											href={projectInfo.githubURL}
											target="_blank"
											rel="noopener noreferrer"
											class="url-link"
										>
											{projectInfo.githubURL}
										</a>
									{:else}
										<span class="missing-info">No GitHub URL provided</span>
									{/if}
								</span>
							</div>
						</div>
					</div>
				</div>

				<div class="confirmation-question">
					<p class="question-text">
						make sure that all the details are correct before you continue!
					</p>
				</div>

				<div class="ship-actions">
					<button class="cancel-btn" onclick={handleClose} disabled={isShipping}>cancel</button>
					<button class="next-btn" onclick={handleNext} disabled={isShipping}> continue! </button>
				</div>
			{:else if currentStep === 2}
				<!-- Step 2: Questions -->
				{#if showInitialContent}
					<div class="project-egg-container" transition:fade={{ duration: 600 }}>
						<img
							class="project-egg"
							src={projectInfo?.egg || '/projects/new_egg1.png'}
							alt="Project egg"
						/>
					</div>

					<h2 class="project-name" transition:fade={{ duration: 600, delay: 200 }}>
						{projectInfo?.name || 'Untitled Project'}
					</h2>
					<p class="hatch-text" transition:fade={{ duration: 600, delay: 400 }}>
						{isReShip ? 'ready to re-ship your project!' : "let's hatch your egg!"}
					</p>
				{/if}

				{#if showQuestions}
					<div class="questions-container" transition:fade={{ duration: 800 }}>
						<div class="question-group">
							<label class="question-label">what parts of your project were not made by you?</label>
							<p class="question-subtitle">(public assets, ai help, help from friends, etc)</p>
							<textarea
								class="question-input"
								bind:value={notMadeByYou}
								placeholder="e.g., used free sprites from itch.io, got help with the physics from a friend..."
							></textarea>
						</div>

						<div class="question-group">
							<label class="question-label">how do you play your project?</label>
							<textarea
								class="question-input"
								bind:value={howToPlay}
								placeholder="e.g., use WASD to move, click to shoot, collect coins to win..."
							></textarea>
						</div>

						<div class="question-group">
							<label class="question-label">
								{isReShip
									? 'additional comments (+ what did you add since the last ship?)'
									: 'any additional comments?'}
							</label>
							<textarea
								class="question-input"
								bind:value={additionalComments}
								placeholder={isReShip
									? 'what improvements or features did you add since your last submission...'
									: "anything else you'd like to share about your project..."}
							></textarea>
						</div>
					</div>

					<div class="ship-actions" transition:fade={{ duration: 600, delay: 200 }}>
						<button class="next-btn" onclick={handleNext} disabled={isShipping || !canProceed()}>
							{canProceed() ? "let's go!" : 'fill in all fields...'}
						</button>
					</div>
				{/if}
			{:else if currentStep === 3}
				<!-- Step 3: Identity Verification -->
				<div class="identity-verification-container">
					<h1 class="ship-title">identity verification</h1>
					<p class="verification-subtitle">
						we need to verify your identity before shipping your project
					</p>

					{#if submitToken}
						<div class="verification-success">
							<div class="success-icon">✓</div>
							<p>Identity verified successfully!</p>
							<p class="token-info">Token: {submitToken.substring(0, 8)}...</p>
						</div>
					{:else}
						<div class="verification-prompt">
							<p>Click the button below to start the identity verification process.</p>
							<button
								class="verify-identity-btn"
								onclick={initiateVerification}
								disabled={isVerifying}
							>
								{isVerifying ? 'Starting verification...' : 'Start Identity Verification'}
							</button>
						</div>
					{/if}

					{#if verificationError}
						<div class="error-message">
							<span>{verificationError}</span>
						</div>
					{/if}

					{#if shippingError}
						<div class="error-message">
							<span>{shippingError}</span>
						</div>
					{/if}

					<div class="ship-actions">
						{#if currentStep > 1}
							<button class="cancel-btn" onclick={handleBack}>back</button>
						{/if}
						<button class="next-btn" onclick={handleNext} disabled={!canProceed()}>
							{canProceed() ? 'continue' : 'complete verification...'}
						</button>
					</div>
				</div>
			{:else if currentStep === 4}
				<!-- Step 4: Egg Hatching (first-time ships only) -->
				<div class="hatching-container">
					{#if showCreature}
						<!-- Show creature with dramatic entrance -->
						<div
							class="creature-celebration"
							class:fade-out={isFadingOut}
							transition:slide={{ duration: 800, axis: 'y' }}
							style="pointer-events: none;"
						>
							<div class="creature-container" transition:scale={{ duration: 1000, start: 0.3 }}>
								<img
									class="hatched-creature"
									src={getCreatureImageFromEgg(projectInfo?.egg)}
									alt="Hatched creature"
									style="pointer-events: none; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;"
								/>
							</div>
							<p class="celebration-text" transition:fade={{ duration: 600, delay: 300 }}>
								🎉 your egg has hatched! 🎉
							</p>
						</div>
					{:else}
						<!-- Egg hatching interface -->
						<div class="hatching-egg-container" class:shaking={isShaking} onclick={handleEggClick}>
							<img
								class="hatching-egg"
								src={projectInfo?.egg || '/projects/new_egg1.png'}
								alt="Project egg"
							/>
						</div>

						{#if pendingHours && pendingHours.total > 0}
							<div class="pending-hours-conversion-notice">
								<p class="conversion-title">Pending Hours</p>
								<div class="conversion-details">
									<div class="conversion-item">
										<span class="conversion-label">Code Hours:</span>
										<span class="conversion-value">{pendingHours.codeHours} hrs</span>
									</div>
									<div class="conversion-item">
										<span class="conversion-label">Art Hours:</span>
										<span class="conversion-value">{pendingHours.artHours} hrs</span>
									</div>
									<div class="conversion-item total">
										<span class="conversion-label">Total:</span>
										<span class="conversion-value">{pendingHours.total} hrs</span>
									</div>
								</div>
								<p class="conversion-note">
									these will count towards your tamagotchi after hatching!
								</p>
							</div>
						{/if}

						<p class="hatch-instruction">your egg is ready to hatch... click it!</p>

						{#if shippingError}
							<div class="error-message">
								<span>{shippingError}</span>
							</div>
						{/if}
					{/if}
				</div>
			{:else if currentStep === 5}
				<!-- Step 5: Re-ship Success (no animation, just confirmation) -->
				<div class="reship-success-container" transition:fade={{ duration: 600 }}>
					<div class="success-icon-large">✓</div>
					<h1 class="ship-title">project re-shipped!</h1>
					<p class="reship-message">your project has been successfully re-submitted for review.</p>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.ship-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background-color: rgba(0, 0, 0, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 99999;
	}

	.ship-content {
		text-align: center;
		color: white;
		max-width: 700px;
		padding: 40px 20px;
	}

	.ship-title {
		font-size: 3em;
		margin: 0 0 40px 0;
		color: white;
		font-weight: 700;
	}

	.project-egg-container {
		margin-bottom: 10px;
	}

	.project-egg {
		width: 80px;
		height: auto;
		filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.3));
	}

	.project-name {
		font-size: 1.6em;
		margin: 0 0 8px 0;
		color: white;
		font-weight: 600;
	}

	.hatch-text {
		font-size: 1em;
		color: #ccc;
		margin: 0 0 15px 0;
		font-style: italic;
	}

	.questions-container {
		text-align: left;
		margin-bottom: 20px;
		max-height: 45vh;
		overflow-y: auto;
		padding-right: 8px;
	}

	.question-group {
		margin-bottom: 18px;
	}

	.question-label {
		display: block;
		font-size: 1em;
		color: white;
		font-weight: 600;
		margin-bottom: 4px;
	}

	.question-subtitle {
		font-size: 0.8em;
		color: #aaa;
		margin: 0 0 6px 0;
		font-style: italic;
	}

	.question-input {
		width: 100%;
		min-height: 60px;
		padding: 8px;
		background: rgba(255, 255, 255, 0.1);
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 6px;
		color: white;
		font-family: inherit;
		font-size: 0.9em;
		line-height: 1.3;
		resize: vertical;
		box-sizing: border-box;
	}

	.question-input::placeholder {
		color: #888;
	}

	.question-input:focus {
		outline: none;
		border-color: #7fa9db;
		background: rgba(255, 255, 255, 0.15);
	}

	/* Custom scrollbar for questions container */
	.questions-container::-webkit-scrollbar {
		width: 6px;
	}

	.questions-container::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}

	.questions-container::-webkit-scrollbar-thumb {
		background: var(--orange);
		border-radius: 3px;
	}

	.questions-container::-webkit-scrollbar-thumb:hover {
		background: var(--yellow);
	}

	.question-text {
		font-size: 1.3em;
		color: white;
		line-height: 1.4;
		font-weight: 500;
		margin: 0;
	}

	.error-message {
		margin-bottom: 30px;
		color: #ff6b6b;
		font-size: 1.1em;
	}

	.ship-actions {
		display: flex;
		gap: 20px;
		justify-content: center;
	}

	.cancel-btn,
	.next-btn {
		padding: 12px 24px;
		border: 2px solid white;
		border-radius: 8px;
		font-family: inherit;
		font-size: 1.1em;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		min-width: 120px;
	}

	.cancel-btn {
		background: transparent;
		color: white;
	}

	.cancel-btn:hover:not(:disabled) {
		background: white;
		color: black;
	}

	.next-btn {
		background: #7fa9db;
		border-color: #7fa9db;
		color: white;
	}

	.next-btn:hover:not(:disabled) {
		background: #5a8bc4;
		border-color: #5a8bc4;
	}

	.cancel-btn:disabled,
	.next-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Hatching step styles */
	.hatching-container {
		text-align: center;
		color: white;
	}

	.hatching-egg-container {
		margin-bottom: 30px;
		cursor: pointer;
		transition: transform 0.1s ease;
	}

	.hatching-egg-container:hover {
		transform: scale(1.05);
	}

	.hatching-egg-container.shaking {
		animation: shake 0.2s ease-in-out;
	}

	.hatching-egg {
		width: 150px;
		height: auto;
		filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.3));
	}

	.hatch-instruction {
		font-size: 1.3em;
		margin-bottom: 20px;
		color: #ccc;
	}

	.pending-hours-conversion-notice {
		background: rgba(255, 193, 7, 0.15);
		border: 2px solid rgba(255, 193, 7, 0.4);
		border-radius: 12px;
		padding: 20px;
		margin: 20px auto;
		max-width: 400px;
		text-align: left;
	}

	.conversion-title {
		font-size: 1.1em;
		color: var(--yellow);
		font-weight: 700;
		margin: 0 0 12px 0;
		text-align: center;
	}

	.conversion-details {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 12px;
	}

	.conversion-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 6px 0;
	}

	.conversion-item.total {
		border-top: 1px solid rgba(255, 193, 7, 0.3);
		padding-top: 10px;
		margin-top: 4px;
		font-weight: 700;
	}

	.conversion-label {
		color: #ccc;
		font-size: 0.95em;
	}

	.conversion-value {
		color: var(--yellow);
		font-weight: 600;
		font-size: 1em;
	}

	.conversion-item.total .conversion-value {
		font-size: 1.1em;
	}

	.conversion-note {
		font-size: 0.85em;
		color: #aaa;
		margin: 8px 0 0 0;
		text-align: center;
		font-style: italic;
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		10%,
		30%,
		50%,
		70%,
		90% {
			transform: translateX(-5px) rotate(-2deg);
		}
		20%,
		40%,
		60%,
		80% {
			transform: translateX(5px) rotate(2deg);
		}
	}

	/* Creature celebration styles */
	.creature-celebration {
		text-align: center;
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 400px;
		transition: opacity 1s ease-out;
		pointer-events: none;
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
	}

	.creature-celebration.fade-out {
		opacity: 0;
	}

	.creature-container {
		position: relative;
		margin-bottom: 30px;
	}

	.hatched-creature {
		width: 250px;
		height: auto;
		filter: drop-shadow(0 0 40px rgba(255, 255, 255, 0.8))
			drop-shadow(0 0 80px rgba(255, 255, 255, 0.4));
		animation: creature-glow 2s ease-in-out infinite alternate;
		pointer-events: none;
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		-webkit-touch-callout: none;
		-webkit-tap-highlight-color: transparent;
	}

	.celebration-text {
		font-size: 2em;
		font-weight: bold;
		color: #fff;
		text-shadow:
			0 0 20px rgba(255, 255, 255, 0.8),
			0 0 40px rgba(255, 255, 255, 0.4);
		animation: text-pulse 1.5s ease-in-out infinite alternate;
	}

	@keyframes creature-glow {
		0% {
			filter: drop-shadow(0 0 40px rgba(255, 255, 255, 0.8))
				drop-shadow(0 0 80px rgba(255, 255, 255, 0.4));
		}
		100% {
			filter: drop-shadow(0 0 60px rgba(255, 255, 255, 1))
				drop-shadow(0 0 120px rgba(255, 255, 255, 0.6));
		}
	}

	@keyframes text-pulse {
		0% {
			text-shadow:
				0 0 20px rgba(255, 255, 255, 0.8),
				0 0 40px rgba(255, 255, 255, 0.4);
		}
		100% {
			text-shadow:
				0 0 30px rgba(255, 255, 255, 1),
				0 0 60px rgba(255, 255, 255, 0.6);
		}
	}

	/* Confirmation Step Styles - Compact Layout */
	.confirmation-subtitle {
		font-size: 1em;
		color: #ccc;
		margin-bottom: 20px;
		text-align: left;
	}

	.project-confirmation-grid {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: 15px;
		margin-bottom: 20px;
		max-width: 100%;
	}

	.confirmation-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		.info-item.pending-hours-item {
			flex-direction: column;
			background: rgba(255, 193, 7, 0.1);
			border: 1px solid rgba(255, 193, 7, 0.3);
			border-radius: 6px;
			padding: 10px;
			gap: 4px;
		}

		.pending-hours-value {
			color: var(--yellow) !important;
			font-weight: 600;
		}

		.hours-breakdown {
			color: #ccc;
			font-size: 0.9em;
			font-weight: normal;
		}

		.pending-hours-note {
			font-size: 0.75em;
			color: #aaa;
			margin: 4px 0 0 0;
			font-style: italic;
		}

		padding: 15px;
	}

	/* Image card */
	.image-card {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px;
	}

	.project-image-preview img {
		max-width: 200px;
		max-height: 200px;
		width: 100%;
		height: auto;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	/* Details card */
	.details-card {
		text-align: left;
	}

	.info-grid {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.info-item {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		gap: 8px;
	}

	.info-label {
		font-weight: 600;
		color: var(--orange);
		font-size: 0.85em;
		min-width: 80px;
		flex-shrink: 0;
	}

	.info-value {
		color: #fff;
		font-size: 0.85em;
		line-height: 1.3;
		word-break: break-word;
		flex: 1;
	}

	.url-link {
		color: var(--yellow);
		text-decoration: underline;
		font-size: 0.85em;
	}

	.url-link:hover {
		color: var(--orange);
	}

	.missing-info {
		color: #ff6b6b;
		font-style: italic;
		font-size: 0.85em;
	}

	.confirmation-question {
		text-align: left;
		margin: 20px 0;
	}

	.confirmation-question .question-text {
		font-size: 1em;
		color: var(--yellow);
		font-weight: 600;
	}

	/* Identity Verification Styles */
	.identity-verification-container {
		text-align: center;
		color: white;
	}

	.verification-subtitle {
		font-size: 1.1em;
		color: #ccc;
		margin-bottom: 30px;
		line-height: 1.5;
	}

	.verification-success {
		background: rgba(76, 175, 80, 0.1);
		border: 1px solid #4caf50;
		border-radius: 8px;
		padding: 20px;
		margin: 20px 0;
	}

	.success-icon {
		font-size: 2em;
		color: #4caf50;
		margin-bottom: 10px;
	}

	.verification-success p {
		margin: 5px 0;
		color: #4caf50;
	}

	.token-info {
		font-family: monospace;
		font-size: 0.9em;
		color: #ccc;
	}

	.verification-prompt {
		margin: 20px 0;
	}

	.verification-prompt p {
		color: #ccc;
		margin-bottom: 20px;
	}

	.verify-identity-btn {
		background: var(--orange);
		color: white;
		border: none;
		padding: 12px 24px;
		border-radius: 8px;
		font-size: 1.1em;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.verify-identity-btn:hover:not(:disabled) {
		background: var(--yellow);
		color: black;
	}

	.verify-identity-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Re-ship Success Styles */
	.reship-success-container {
		text-align: center;
		color: white;
		padding: 40px 20px;
	}

	.success-icon-large {
		font-size: 6em;
		color: #4caf50;
		margin-bottom: 20px;
		animation: success-pop 0.6s ease-out;
	}

	@keyframes success-pop {
		0% {
			transform: scale(0);
			opacity: 0;
		}
		50% {
			transform: scale(1.2);
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.reship-message {
		font-size: 1.2em;
		color: #ccc;
		margin: 20px 0;
		line-height: 1.5;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.project-confirmation-grid {
			grid-template-columns: 1fr;
			gap: 12px;
		}

		.image-card {
			order: 1;
		}

		.details-card {
			order: 2;
		}

		.project-image-preview img {
			max-width: 150px;
			max-height: 150px;
		}

		/* Make questions even more compact on mobile */
		.questions-container {
			max-height: 35vh;
			padding-right: 6px;
		}

		.question-group {
			margin-bottom: 12px;
		}

		.question-input {
			min-height: 50px;
			padding: 6px;
			font-size: 0.85em;
		}

		.question-label {
			font-size: 0.9em;
		}

		.question-subtitle {
			font-size: 0.75em;
		}

		.project-egg {
			width: 50px;
		}

		.project-name {
			font-size: 1.2em;
			margin: 0 0 4px 0;
		}

		.hatch-text {
			font-size: 0.9em;
			margin: 0 0 10px 0;
		}

		.project-egg-container {
			margin-bottom: 5px;
		}
	}
</style>
