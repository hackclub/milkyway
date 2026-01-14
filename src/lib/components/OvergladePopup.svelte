<script>
	let { showPopup, onClose, user } = $props();
	
	/** @type {string | null} */
	let selectedOption = $state(null);
	let isSubmitting = $state(false);
	let responseMessage = $state('');
	let isProbablyResponse = $state(false);
	
	// Map UI options to Airtable values
	const optionMap = {
		'i\'m planning to!': 'probably',
		'maybe, working on it!': 'maybe',
		'probably not!': 'probably not',
        "i don't know yet": 'idk'
	};
	
	const options = [
		'i\'m planning to!',
		'maybe, working on it!',
		'probably not!',
		"i don't know yet"
	];
	
	/**
	 * @param {string} option
	 */
	function handleRadioChange(option) {
		// Don't prevent changes if submitting - user should be able to change selection
		// Only the "okay!" button will be disabled during submission
		
		selectedOption = option;
		
		// Set response message based on selection
		if (option === 'i\'m planning to!') {
			responseMessage = "awesome, can't wait to see you there!";
			isProbablyResponse = true;
		} else {
			responseMessage = "if your parents are uncertain, dm tongyu for a one-on-one call to help convince them :)\nif you're worried about visa, singapore visas get approved really easily — dm tongyu for more information!";
			isProbablyResponse = false;
		}
	}
	
	async function handleOkay() {
		if (!selectedOption || isSubmitting) return;
		
		isSubmitting = true;
		
		try {
			/** @type {string} */
			const airtableValue = optionMap[/** @type {keyof typeof optionMap} */ (selectedOption)];
			const response = await fetch('/api/update-overglade', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					overglade: airtableValue
				})
			});
			
			const result = await response.json();
			
			if (result.success) {
				onClose();
			} else {
				console.error('Failed to update overglade status:', result.error);
				// Still close even if update fails
				onClose();
			}
		} catch (error) {
			console.error('Error updating overglade status:', error);
			// Still close even if error occurs
			onClose();
		} finally {
			isSubmitting = false;
		}
	}
	
	function handleClose() {
		// Only allow closing if they've answered (selectedOption is set)
		if (selectedOption && !isSubmitting) {
			handleOkay();
		}
	}
</script>

{#if showPopup}
	<div 
		class="popup-overlay" 
		onclick={selectedOption ? handleClose : undefined}
		onkeydown={(e) => selectedOption && e.key === 'Escape' && handleClose()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div 
			class="popup-content"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<img src="/overglade-banner.png" alt="Overglade" class="banner-image" />
			<div class="popup-inner">
				<h3>quick survey: are you coming to overglade?</h3>
				<p class="subtitle">this is not a binding answer :)</p>
			
			<div class="radio-container">
				{#each options as option}
					<label class="radio-label">
						<input
							type="radio"
							name="overglade"
							value={option}
							checked={selectedOption === option}
							onchange={() => handleRadioChange(option)}
							class="radio-input"
						/>
						<span class="radio-text">{option}</span>
					</label>
				{/each}
			</div>
			
			{#if selectedOption}
				<div class="response-container">
					{#if isProbablyResponse}
						<p class="response-text">{responseMessage}</p>
					{:else}
						{@const lines = responseMessage.split('\n')}
						{#each lines as line}
							<p class="response-text">{line}</p>
						{/each}
					{/if}
				</div>
			{/if}
			
			<div class="okay-button-container">
				<button 
					class="okay-button" 
					onclick={handleOkay}
					disabled={!selectedOption || isSubmitting}
				>
					{isSubmitting ? 'saving...' : 'okay!'}
				</button>
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
		z-index: 1000;
	}

	.popup-content {
		background-color: #FBF2BF;
		border: 2px solid #F7C881;
		border-radius: 8px;
		padding: 0;
		position: relative;
		text-align: left;
		max-width: 420px;
		max-height: 90vh;
		color: #2c3e50;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		overflow-y: auto;
		overflow-x: hidden;
	}

	.banner-image {
		width: 100%;
		height: auto;
		display: block;
		margin: 0;
		border-radius: 6px 6px 0 0;
	}

	.popup-inner {
		padding: 16px;
	}

	.popup-content h3 {
		margin: 0 0 4px 0;
		color: #2c3e50;
		font-size: 1.1rem;
		font-weight: 600;
		line-height: 1.4;
		text-align: center;
	}

	.subtitle {
		margin: 0 0 12px 0;
		color: #666;
		font-size: 0.85rem;
		line-height: 1.4;
		text-align: center;
	}

	.radio-container {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 12px;
	}

	.radio-label {
		display: flex;
		align-items: center;
		gap: 10px;
		cursor: pointer;
		padding: 6px;
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.radio-label:hover {
		background-color: rgba(247, 200, 129, 0.2);
	}

	.radio-input {
		width: 18px;
		height: 18px;
		cursor: pointer;
		accent-color: #F7C881;
		flex-shrink: 0;
	}

	.radio-input:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.radio-text {
		color: #2c3e50;
		font-size: 0.95rem;
		font-weight: 400;
		cursor: pointer;
	}

	.response-container {
		margin-bottom: 12px;
		padding-top: 12px;
		border-top: 1px solid rgba(247, 200, 129, 0.3);
	}

	.response-text {
		margin: 0 0 6px 0;
		color: #34495e;
		font-size: 0.85rem;
		line-height: 1.4;
	}

	.response-text:last-of-type {
		margin-bottom: 0;
	}

	.okay-button-container {
		display: flex;
		justify-content: center;
		margin-top: 4px;
	}

	.okay-button {
		background-color: #F7C881;
		border: 2px solid #F7C881;
		border-radius: 6px;
		padding: 8px 24px;
		color: #2c3e50;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		font-family: inherit;
	}

	.okay-button:hover:not(:disabled) {
		background-color: #e67e00;
		border-color: #e67e00;
		color: white;
	}

	.okay-button:disabled {
		background-color: #e0e0e0;
		border-color: #e0e0e0;
		color: #999;
		cursor: not-allowed;
		opacity: 0.6;
	}
</style>
