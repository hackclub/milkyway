<script>
	import { SvelteSet } from 'svelte/reactivity';

	let { onSubmit, onClose } = $props();

	let title = $state('');
	let description = $state('');
	let photos = $state([]);
	let isDragging = $state(false);

	let projectsWithHours = $state([]);
	let selectedProjects = new SvelteSet();
	let isLoadingProjects = $state(false);
	let noProjectsFound = $state(false);
	let hackatimeUserNotFound = $state(false);
	let currentTotalHours = $derived(calculateSelectedProjectHours());

	function calculateSelectedProjectHours() {
		let totalHours = 0;
		for (const project of projectsWithHours) {
			if (selectedProjects.has(project.id)) {
				totalHours += project.totalHours || 0;
			}
		}
		return Math.round(totalHours * 100) / 100;
	}

	// fetch projects with hours logged today
	async function fetchProjectsWithHours() {
		try {
			isLoadingProjects = true;
			noProjectsFound = false;
			hackatimeUserNotFound = false;

			const response = await fetch('/api/get-projects-hours-today', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const result = await response.json();

			if (result.success && result.projects) {
				projectsWithHours = result.projects;
				noProjectsFound = result.projects.length === 0;
				hackatimeUserNotFound = result.hackatimeUserNotFound || false;
			} else {
				projectsWithHours = [];
				noProjectsFound = true;
			}
		} catch (error) {
			console.error('Error fetching projects with hours:', error);
			projectsWithHours = [];
			noProjectsFound = true;
		} finally {
			isLoadingProjects = false;
		}
	}

	function toggleProject(projectId) {
		if (selectedProjects.has(projectId)) {
			selectedProjects.delete(projectId);
		} else {
			selectedProjects.add(projectId);
		}
		selectedProjects = new SvelteSet(selectedProjects);
	}

	// fetch projects on mount
	$effect(() => {
		fetchProjectsWithHours();
	});

	function handleFileSelect(event) {
		const files = Array.from(event.target.files);
		addPhotos(files);
	}

	function addPhotos(files) {
		const imageFiles = files.filter((file) => file.type.startsWith('image/'));

		imageFiles.forEach((file) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				photos = [
					...photos,
					{
						file: file,
						preview: e.target.result,
						name: file.name
					}
				];
			};
			reader.readAsDataURL(file);
		});
	}

	function removePhoto(index) {
		photos = photos.filter((_, i) => i !== index);
	}

	function handleDragOver(event) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(event) {
		event.preventDefault();
		isDragging = false;
	}

	function handleDrop(event) {
		event.preventDefault();
		isDragging = false;
		const files = Array.from(event.dataTransfer.files);
		addPhotos(files);
	}

	function handleSubmit() {
		if (!title.trim()) {
			alert('please add a title!');
			return;
		}

		if (!description.trim()) {
			alert('please add a description!');
			return;
		}

		if (selectedProjects.size === 0) {
			alert('please select at least one project!');
			return;
		}

		if (photos.length === 0) {
			alert('please add at least one photo!');
			return;
		}

		const formData = new FormData();
		formData.append('title', title.trim());
		formData.append('description', description.trim());

		// add selected project IDs as comma-separated string
		const projectIds = Array.from(selectedProjects).join(',');
		formData.append('selectedProjects', projectIds);

		photos.forEach((photo, index) => {
			formData.append(`photo${index}`, photo.file);
		});

		if (onSubmit) {
			onSubmit(formData);
		}
	}
</script>

<div class="devlog-container">
	<button class="close-btn" onclick={() => onClose()}>×</button>

	<h2>Create Devlog</h2>

	<div class="form-section">
		<label for="devlog-title">Title</label>
		<input
			id="devlog-title"
			type="text"
			placeholder="write something catchy here!"
			bind:value={title}
			maxlength="100"
		/>
	</div>

	<div class="form-section">
		<label for="devlog-description">Description</label>
		<textarea
			id="devlog-description"
			placeholder="share what you've been working on, how you managed to overcome challenges, and any exciting updates!"
			bind:value={description}
			maxlength="2000"
			rows="6"
		></textarea>
		<div class="char-count">{description.length}/2000</div>
	</div>

	<div class="form-section">
		<label>Projects</label>
		{#if isLoadingProjects}
			<div class="projects-loading">loading your projects...</div>
		{:else if hackatimeUserNotFound}
			<div class="projects-not-found">
				no Hackatime account found! make sure you have hackatime set up.
				<a
					href="https://hackatime.hackclub.com/my/wakatime_setup"
					target="_blank"
					rel="noopener noreferrer">instructions</a
				>
			</div>
		{:else if noProjectsFound}
			<div class="projects-empty">
				no hours logged today on any projects. start coding to track your hours!
			</div>
		{:else}
			<div class="projects-list">
				{#each projectsWithHours as project (project.id)}
					<label class="project-item">
						<input
							type="checkbox"
							checked={selectedProjects.has(project.id)}
							onchange={() => toggleProject(project.id)}
						/>
						<span class="project-name">{project.name}</span>
						<span class="project-hours-breakdown">
							{#if project.hackatimeHours > 0 && project.artHours > 0}
								<span class="hours-code" title="code hours">{project.hackatimeHours}h code</span>
								+
								<span class="hours-art" title="art hours">{project.artHours}h art</span>
							{:else if project.hackatimeHours > 0}
								<span class="hours-code">{project.hackatimeHours}h code</span>
							{:else if project.artHours > 0}
								<span class="hours-art">{project.artHours}h art</span>
							{/if}
						</span>
						<span class="project-total-hours">{project.totalHours}h</span>
					</label>
				{/each}
			</div>
			<div class="total-hours">total hours: {currentTotalHours}h</div>
		{/if}
	</div>

	<div class="form-section">
		<label>Photos</label>
		<div
			class="photo-upload-area"
			class:dragging={isDragging}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		>
			<input
				type="file"
				id="photo-input"
				accept="image/*"
				multiple
				onchange={handleFileSelect}
				style="display: none;"
			/>
			<label for="photo-input" class="upload-label">
				<p>drop photos here</p>
				<span class="upload-hint">PNG, JPG, GIF up to 10mb</span>
			</label>
		</div>

		{#if photos.length > 0}
			<div class="photo-preview-grid">
				{#each photos as photo, index (index)}
					<div class="photo-preview-item">
						<img src={photo.preview} alt={photo.name} />
						<button class="remove-photo-btn" onclick={() => removePhoto(index)}>×</button>
						<div class="photo-name">{photo.name}</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="button-group">
		<button class="secondary-btn" onclick={() => onClose()}>Cancel</button>
		<button class="primary-btn" onclick={handleSubmit}>Publish Devlog</button>
	</div>
</div>

<style>
	.devlog-container {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background-color: var(--yellow);
		border: 4px solid var(--orange);
		border-radius: 8px;
		padding: 32px;
		min-width: 500px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.close-btn {
		position: absolute;
		top: 16px;
		right: 16px;
		background: var(--orange);
		border: none;
		border-radius: 50%;
		width: 36px;
		height: 36px;
		font-size: 28px;
		line-height: 1;
		cursor: pointer;
		color: white;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		background: #f0b563;
		transform: rotate(90deg);
	}

	h2 {
		margin: 0 0 24px 0;
		color: #333;
		font-weight: 800;
		font-size: 1.8em;
	}

	.form-section {
		margin-bottom: 24px;
	}

	label {
		display: block;
		margin-bottom: 8px;
		font-weight: 800;
		color: #555;
		font-size: 0.9em;
	}

	input[type='text'],
	textarea {
		width: 100%;
		padding: 12px 16px;
		border: 3px solid var(--orange);
		border-radius: 8px;
		font-family: inherit;
		font-size: 0.9em;
		background: white;
		transition: all 0.2s ease;
		resize: vertical;
	}

	input[type='text']:focus,
	textarea:focus {
		outline: none;
		border-color: #f0b563;
		box-shadow: 0 0 0 3px rgba(247, 200, 129, 0.2);
	}

	.char-count {
		text-align: right;
		font-size: 0.75em;
		color: #888;
		margin-top: 4px;
	}

	/* Projects styles */
	.projects-loading,
	.projects-empty,
	.projects-not-found {
		padding: 16px;
		border: 3px solid var(--orange);
		border-radius: 8px;
		background: white;
		text-align: center;
		color: #666;
		font-size: 0.85em;
	}

	.projects-not-found a {
		color: var(--orange);
		text-decoration: underline;
	}

	.projects-list {
		border: 3px solid var(--orange);
		border-radius: 8px;
		background: white;
		padding: 12px;
		max-height: 250px;
		overflow-y: auto;
	}

	.project-item {
		display: flex;
		align-items: center;
		padding: 10px;
		cursor: pointer;
		border-radius: 4px;
		transition: background 0.2s ease;
		gap: 8px;
		border-bottom: 1px solid #f0f0f0;
	}

	.project-item:last-child {
		border-bottom: none;
	}

	.project-item:hover {
		background: var(--yellow);
	}

	.project-item input[type='checkbox'] {
		cursor: pointer;
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}

	.project-name {
		flex: 1;
		font-size: 0.9em;
		color: #333;
		font-weight: 600;
	}

	.project-hours-breakdown {
		display: flex;
		gap: 4px;
		font-size: 0.75em;
		color: #666;
		align-items: center;
	}

	.hours-code {
		color: #73ace0;
		font-weight: 600;
	}

	.hours-art {
		color: #e07396;
		font-weight: 600;
	}

	.project-total-hours {
		font-weight: 800;
		color: var(--orange);
		font-size: 0.9em;
		flex-shrink: 0;
		min-width: 50px;
		text-align: right;
	}

	.total-hours {
		margin-top: 8px;
		text-align: right;
		font-weight: 800;
		color: #333;
		font-size: 0.95em;
	}

	.photo-upload-area {
		border: 3px dashed var(--orange);
		border-radius: 12px;
		padding: 32px;
		text-align: center;
		transition: all 0.3s ease;
		background: white;
	}

	.photo-upload-area.dragging {
		border-color: #f0b563;
		background: rgba(247, 200, 129, 0.1);
		transform: scale(1.02);
	}

	.upload-label {
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		color: #666;
	}

	.upload-label p {
		margin: 0;
		font-weight: 600;
		color: #333;
	}

	.upload-hint {
		font-size: 0.75em;
		color: #888;
	}

	.photo-preview-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 12px;
		margin-top: 16px;
	}

	.photo-preview-item {
		position: relative;
		aspect-ratio: 1;
		border-radius: 8px;
		overflow: hidden;
		border: 3px solid var(--orange);
		background: white;
	}

	.photo-preview-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.remove-photo-btn {
		position: absolute;
		top: 4px;
		right: 4px;
		background: rgba(247, 100, 100, 0.95);
		border: none;
		border-radius: 50%;
		width: 24px;
		height: 24px;
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
		color: white;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
	}

	.photo-preview-item:hover .remove-photo-btn {
		opacity: 1;
	}

	.remove-photo-btn:hover {
		background: rgb(220, 80, 80);
		transform: scale(1.1);
	}

	.photo-name {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 4px;
		font-size: 0.65em;
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
	}

	.button-group {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
		margin-top: 32px;
	}

	.primary-btn,
	.secondary-btn {
		padding: 12px 24px;
		border: none;
		border-radius: 8px;
		font-family: inherit;
		font-size: 0.9em;
		font-weight: 800;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.primary-btn {
		background: #51cf66;
		color: white;
		border: 3px solid #40a653;
	}

	.primary-btn:hover {
		background: #40a653;
		border-color: #339544;
	}

	.secondary-btn {
		background: #ff6b6b;
		color: white;
		border: 3px solid #cc5555;
	}

	.secondary-btn:hover {
		background: #cc5555;
		border-color: #aa4444;
	}

	/* Scrollbar styling */
	.devlog-container::-webkit-scrollbar {
		width: 8px;
	}

	.devlog-container::-webkit-scrollbar-track {
		background: var(--yellow);
	}

	.devlog-container::-webkit-scrollbar-thumb {
		background: var(--orange);
		border-radius: 4px;
	}

	.devlog-container::-webkit-scrollbar-thumb:hover {
		background: #f0b563;
	}
</style>
