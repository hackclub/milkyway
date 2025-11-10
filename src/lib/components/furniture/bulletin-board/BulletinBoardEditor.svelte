<script>
	let { bulletinBoardData, saveData } = $props();

	let components = $state(bulletinBoardData?.components || []);
	let draggedComponent = $state(null);
	let dragOffset = $state({ x: 0, y: 0 });
	let selectedComponent = $state(null);
	let canvasElement;
	let canvasWrapperElement;
	let canvasScale = $state(1);

	let isLoading = $state(false);

	let resizingComponent = $state(null);
	let resizeHandle = $state(null);
	let resizeStart = $state({ x: 0, y: 0, width: 0, height: 0 });

	let propertiesDragging = $state(false);
	let propertiesPosition = $state({ x: 20, y: 20 });
	let propertiesDragOffset = $state({ x: 0, y: 0 });
	let propertiesPanelElement;
	let propertiesMinimized = $state(false);

	const CANVAS_WIDTH = 714;
	const CANVAS_HEIGHT = 500;

	const componentTypes = [
		{ type: 'text', label: 'Text' },
		{ type: 'link', label: 'Link' },
		{ type: 'image', label: 'Image' }
	];

	$effect(() => {
		if (canvasWrapperElement) {
			const updateScale = () => {
				const wrapperRect = canvasWrapperElement.getBoundingClientRect();
				const padding = 64;
				const availableWidth = wrapperRect.width - padding;
				const availableHeight = wrapperRect.height - padding;

				const scaleX = availableWidth / CANVAS_WIDTH;
				const scaleY = availableHeight / CANVAS_HEIGHT;

				canvasScale = Math.min(scaleX, scaleY, 1);
			};

			updateScale();

			const resizeObserver = new ResizeObserver(updateScale);
			resizeObserver.observe(canvasWrapperElement);

			return () => resizeObserver.disconnect();
		}
	});

	function createComponent(type) {
		const newComponent = {
			id: Date.now() + Math.random(),
			type,
			x: 50,
			y: 50,
			width: 200,
			height: type === 'image' ? 150 : 60
		};

		if (type === 'text') {
			newComponent.content = 'Double click to edit';
			newComponent.fontSize = 16;
			newComponent.color = '#000000';
		} else if (type === 'link') {
			newComponent.url = 'https://example.com';
			newComponent.label = 'Example Link';
		} else if (type === 'image') {
			newComponent.url = 'https://picsum.photos/200/150';
			newComponent.alt = 'Placeholder image';
		}

		components = [...components, newComponent];
		selectedComponent = newComponent;
	}

	function startDrag(event, component) {
		if (resizingComponent) return;
		event.stopPropagation();
		event.preventDefault();
		draggedComponent = component;

		const canvasRect = canvasElement.getBoundingClientRect();

		const scaledX = (event.clientX - canvasRect.left) / canvasScale;
		const scaledY = (event.clientY - canvasRect.top) / canvasScale;

		dragOffset = {
			x: scaledX - component.x,
			y: scaledY - component.y
		};

		selectedComponent = component;
	}

	function startResize(event, component, handle) {
		event.preventDefault();
		event.stopPropagation();
		resizingComponent = component;
		resizeHandle = handle;

		const canvasRect = canvasElement.getBoundingClientRect();
		const scaledX = (event.clientX - canvasRect.left) / canvasScale;
		const scaledY = (event.clientY - canvasRect.top) / canvasScale;

		resizeStart = {
			x: scaledX,
			y: scaledY,
			width: component.width,
			height: component.height,
			componentX: component.x,
			componentY: component.y
		};

		selectedComponent = component;
	}

	function onDrag(event) {
		if (draggedComponent && canvasElement && !resizingComponent) {
			const canvasRect = canvasElement.getBoundingClientRect();

			const scaledX = (event.clientX - canvasRect.left) / canvasScale;
			const scaledY = (event.clientY - canvasRect.top) / canvasScale;

			const newX = scaledX - dragOffset.x;
			const newY = scaledY - dragOffset.y;

			draggedComponent.x = Math.max(0, Math.min(newX, CANVAS_WIDTH - draggedComponent.width));
			draggedComponent.y = Math.max(0, Math.min(newY, CANVAS_HEIGHT - draggedComponent.height));

			components = [...components];
		}

		if (resizingComponent && canvasElement) {
			const canvasRect = canvasElement.getBoundingClientRect();
			const scaledX = (event.clientX - canvasRect.left) / canvasScale;
			const scaledY = (event.clientY - canvasRect.top) / canvasScale;

			const deltaX = scaledX - resizeStart.x;
			const deltaY = scaledY - resizeStart.y;

			const minSize = 30;

			if (resizeHandle.includes('e')) {
				resizingComponent.width = Math.max(
					minSize,
					Math.min(resizeStart.width + deltaX, CANVAS_WIDTH - resizingComponent.x)
				);
			}
			if (resizeHandle.includes('w')) {
				const newWidth = Math.max(minSize, resizeStart.width - deltaX);
				const newX = resizeStart.componentX + (resizeStart.width - newWidth);
				if (newX >= 0) {
					resizingComponent.width = newWidth;
					resizingComponent.x = newX;
				}
			}
			if (resizeHandle.includes('s')) {
				resizingComponent.height = Math.max(
					minSize,
					Math.min(resizeStart.height + deltaY, CANVAS_HEIGHT - resizingComponent.y)
				);
			}
			if (resizeHandle.includes('n')) {
				const newHeight = Math.max(minSize, resizeStart.height - deltaY);
				const newY = resizeStart.componentY + (resizeStart.height - newHeight);
				if (newY >= 0) {
					resizingComponent.height = newHeight;
					resizingComponent.y = newY;
				}
			}

			components = [...components];
		}

		if (propertiesDragging && propertiesPanelElement) {
			const bulletinBoardEditor = propertiesPanelElement.closest('.bulletin-board-editor');
			const editorRect = bulletinBoardEditor.getBoundingClientRect();
			const panelRect = propertiesPanelElement.getBoundingClientRect();

			const newX = event.clientX - editorRect.left - propertiesDragOffset.x;
			const newY = event.clientY - editorRect.top - propertiesDragOffset.y;

			// Allow panel to move freely within the bulletin board editor bounds
			propertiesPosition.x = Math.max(0, Math.min(newX, editorRect.width - panelRect.width));
			propertiesPosition.y = Math.max(0, Math.min(newY, editorRect.height - panelRect.height));
		}
	}

	function stopDrag() {
		draggedComponent = null;
		resizingComponent = null;
		resizeHandle = null;
		propertiesDragging = false;
	}

	function selectComponent(event, component) {
		event.stopPropagation();
		selectedComponent = component;
	}

	function deleteComponent() {
		if (!selectedComponent) return;
		components = components.filter((c) => c.id !== selectedComponent.id);
		selectedComponent = null;
	}

	function updateComponent(field, value) {
		if (!selectedComponent) return;
		selectedComponent[field] = value;
		components = [...components];
	}

	async function handleSave() {
		isLoading = true;
		await saveData({ components });
	}

	function deselectComponent() {
		if (!resizingComponent && !draggedComponent) {
			selectedComponent = null;
		}
	}

	function closeProperties() {
		selectedComponent = null;
	}

	function togglePropertiesMinimize() {
		propertiesMinimized = !propertiesMinimized;
	}

	function startPropertiesDrag(event) {
		if (!propertiesPanelElement) return;
		if (event.target.closest('.close-btn') || event.target.closest('.minimize-btn')) return;

		event.preventDefault();
		propertiesDragging = true;
		const panelRect = propertiesPanelElement.getBoundingClientRect();

		propertiesDragOffset = {
			x: event.clientX - panelRect.left,
			y: event.clientY - panelRect.top
		};
	}
</script>

<svelte:window on:mousemove={onDrag} on:mouseup={stopDrag} />

<div class="bulletin-board-editor">
	<div class="toolbar">
		<div class="component-buttons">
			{#each componentTypes as { type, label } (type)}
				<button class="add-component-btn action-btn" onclick={() => createComponent(type)}>
					Add {label}
				</button>
			{/each}
		</div>
		<div class="action-buttons">
			<span class="scale-indicator">Scale: {Math.round(canvasScale * 100)}%</span>
			{#if selectedComponent}
				<button class="delete-btn action-btn" onclick={deleteComponent}>Delete</button>
			{/if}
			<button class="save-btn action-btn" onclick={handleSave} disabled={isLoading}>Save</button>
		</div>
	</div>

	<div class="editor-container">
		<div class="canvas-wrapper" bind:this={canvasWrapperElement}>
			<div
				class="canvas"
				bind:this={canvasElement}
				onclick={deselectComponent}
				style="width: {CANVAS_WIDTH}px; height: {CANVAS_HEIGHT}px; transform: scale({canvasScale}); transform-origin: center;"
			>
				{#each components as component (component.id)}
					<div
						class="component {component.type}"
						class:selected={selectedComponent?.id === component.id}
						class:dragging={draggedComponent?.id === component.id}
						class:resizing={resizingComponent?.id === component.id}
						style="left: {component.x}px; top: {component.y}px; width: {component.width}px; height: {component.height}px;"
						onmousedown={(e) => startDrag(e, component)}
						onclick={(e) => selectComponent(e, component)}
						role="button"
						tabindex="0"
					>
						{#if component.type === 'text'}
							<div
								class="text-content"
								style="font-size: {component.fontSize || 16}px; color: {component.color ||
									'#000'}; font-family: {component.fontFamily || 'inherit'};"
							>
								{component.content}
							</div>
						{:else if component.type === 'link'}
							<div class="link-content">
								<span class="link-icon">🔗</span>
								<span class="link-text">{component.label || component.url}</span>
							</div>
						{:else if component.type === 'image'}
							<img
								src={component.url}
								alt={component.alt || 'Image'}
								class="image-content"
								draggable="false"
							/>
						{/if}

						{#if selectedComponent?.id === component.id}
							<div class="resize-handles">
								<div
									class="resize-handle nw"
									onmousedown={(e) => startResize(e, component, 'nw')}
								></div>
								<div
									class="resize-handle n"
									onmousedown={(e) => startResize(e, component, 'n')}
								></div>
								<div
									class="resize-handle ne"
									onmousedown={(e) => startResize(e, component, 'ne')}
								></div>
								<div
									class="resize-handle e"
									onmousedown={(e) => startResize(e, component, 'e')}
								></div>
								<div
									class="resize-handle se"
									onmousedown={(e) => startResize(e, component, 'se')}
								></div>
								<div
									class="resize-handle s"
									onmousedown={(e) => startResize(e, component, 's')}
								></div>
								<div
									class="resize-handle sw"
									onmousedown={(e) => startResize(e, component, 'sw')}
								></div>
								<div
									class="resize-handle w"
									onmousedown={(e) => startResize(e, component, 'w')}
								></div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</div>

	{#if selectedComponent}
		<div
			class="properties-panel"
			class:dragging={propertiesDragging}
			class:minimized={propertiesMinimized}
			bind:this={propertiesPanelElement}
			style="left: {propertiesPosition.x}px; top: {propertiesPosition.y}px;"
		>
			<div class="properties-header" onmousedown={startPropertiesDrag}>
				<h3>Properties</h3>
				<div class="header-buttons">
					<button
						class="minimize-btn"
						onclick={togglePropertiesMinimize}
						title={propertiesMinimized ? 'Expand' : 'Minimize'}
					>
						{propertiesMinimized ? '▼' : '▲'}
					</button>
					<button class="close-btn" onclick={closeProperties}>✕</button>
				</div>
			</div>
			{#if !propertiesMinimized}
				<div class="properties-content">
					<div class="property-group">
						<label>X Position:</label>
						<input
							type="number"
							value={selectedComponent.x}
							oninput={(e) => updateComponent('x', parseInt(e.target.value) || 0)}
						/>
					</div>
					<div class="property-group">
						<label>Y Position:</label>
						<input
							type="number"
							value={selectedComponent.y}
							oninput={(e) => updateComponent('y', parseInt(e.target.value) || 0)}
						/>
					</div>
					<div class="property-group">
						<label>Width:</label>
						<input
							type="number"
							value={selectedComponent.width}
							oninput={(e) => updateComponent('width', parseInt(e.target.value) || 50)}
						/>
					</div>
					<div class="property-group">
						<label>Height:</label>
						<input
							type="number"
							value={selectedComponent.height}
							oninput={(e) => updateComponent('height', parseInt(e.target.value) || 50)}
						/>
					</div>

					{#if selectedComponent.type === 'text'}
						<div class="property-group">
							<label>Content:</label>
							<textarea
								value={selectedComponent.content}
								oninput={(e) => updateComponent('content', e.target.value)}
							></textarea>
						</div>
						<div class="property-group">
							<label>Font Size:</label>
							<input
								type="number"
								value={selectedComponent.fontSize}
								oninput={(e) => updateComponent('fontSize', parseInt(e.target.value) || 16)}
							/>
						</div>
						<div class="property-group">
							<label>Color:</label>
							<input
								type="color"
								value={selectedComponent.color}
								oninput={(e) => updateComponent('color', e.target.value)}
							/>
						</div>
						<div class="property-group">
							<label>Font:</label>
							<input
								type="text"
								value={selectedComponent.fontFamily}
								oninput={(e) => updateComponent('fontFamily', e.target.value)}
							/>
						</div>
					{:else if selectedComponent.type === 'link'}
						<div class="property-group">
							<label>URL:</label>
							<input
								type="url"
								value={selectedComponent.url}
								oninput={(e) => updateComponent('url', e.target.value)}
							/>
						</div>
						<div class="property-group">
							<label>Label:</label>
							<input
								type="text"
								value={selectedComponent.label}
								oninput={(e) => updateComponent('label', e.target.value)}
							/>
						</div>
					{:else if selectedComponent.type === 'image'}
						<div class="property-group">
							<label>Image URL:</label>
							<input
								type="url"
								value={selectedComponent.url}
								oninput={(e) => updateComponent('url', e.target.value)}
							/>
						</div>
						<div class="property-group">
							<label>Alt Text:</label>
							<input
								type="text"
								value={selectedComponent.alt}
								oninput={(e) => updateComponent('alt', e.target.value)}
							/>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.bulletin-board-editor {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		background-color: #f5f5f5;
		border-radius: 8px;
		font-family: 'Futura', sans-serif;
	}

	.toolbar {
		display: flex;
		justify-content: space-between;
		padding: 12px;
		background-color: white;
		border-bottom: 2px solid #ddd;
		gap: 12px;
		flex-wrap: wrap;
	}

	.component-buttons,
	.action-buttons {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		align-items: center;
		font-family: 'Futura', sans-serif;
	}

	.scale-indicator {
		padding: 8px 12px;
		background-color: #f0f0f0;
		border-radius: 4px;
		font-size: 14px;
		font-weight: 500;
		color: #555;
	}

	.add-component-btn,
	.save-btn,
	.delete-btn {
		padding: 8px 16px;
		border: 3px solid;
		border-radius: 4px;
		font-weight: 500;
		font-size: 17px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.add-component-btn {
		background-color: #4a90e2;
		border-color: #3f78b8;
		color: white;
	}

	.add-component-btn:hover {
		background-color: #357abd;
	}

	.save-btn {
		background-color: #5cb85c;
		border-color: #40a653;
		color: white;
	}

	.save-btn:hover {
		background-color: #4cae4c;
	}

	.save-btn:disabled {
		background-color: #a5d6a7;
		border-color: #81c784;
		cursor: not-allowed;
	}

	.delete-btn {
		background: #ff6b6b;
		border-color: #cc5555;
		color: white;
	}

	.delete-btn:hover {
		background-color: #c9302c;
	}

	.editor-container {
		flex: 1;
		position: relative;
		overflow: hidden;
	}

	.canvas-wrapper {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: auto;
		scroll-behavior: smooth;
	}

	.canvas {
		position: relative;
		background-color: #fbf2bf;
		border: 3px solid #f7c881;
		border-radius: 8px;
		user-select: none;
		flex-shrink: 0;
	}

	.component {
		position: absolute;
		cursor: move;
		border: 2px solid transparent;
		border-radius: 4px;
		transition: border-color 0.2s;
		user-select: none;
	}

	.component:hover {
		border-color: #4a90e2;
	}

	.component.selected {
		border-color: #357abd;
		box-shadow: 0 0 0 2px rgba(69, 144, 226, 0.3);
	}

	.component.dragging {
		opacity: 0.7;
		cursor: grabbing;
	}

	.component.resizing {
		opacity: 0.9;
	}

	.text-content {
		padding: 8px;
		border-radius: 4px;
		white-space: pre-wrap;
		word-wrap: break-word;
		height: 100%;
		overflow: auto;
		pointer-events: none;
	}

	.link-content {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px;
		background-color: #4a90e2;
		color: white;
		border-radius: 4px;
		font-weight: 500;
		height: 100%;
		pointer-events: none;
	}

	.link-icon {
		font-size: 20px;
	}

	.link-text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.image-content {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 4px;
		pointer-events: none;
	}

	.resize-handles {
		position: absolute;
		inset: -6px;
		pointer-events: none;
	}

	.resize-handle {
		position: absolute;
		background-color: #357abd;
		border: 2px solid white;
		pointer-events: all;
		z-index: 10;
	}

	.resize-handle.n,
	.resize-handle.s {
		width: 20px;
		height: 8px;
		left: 50%;
		transform: translateX(-50%);
		cursor: ns-resize;
	}

	.resize-handle.e,
	.resize-handle.w {
		width: 8px;
		height: 20px;
		top: 50%;
		transform: translateY(-50%);
		cursor: ew-resize;
	}

	.resize-handle.n {
		top: 0;
	}
	.resize-handle.s {
		bottom: 0;
	}
	.resize-handle.e {
		right: 0;
	}
	.resize-handle.w {
		left: 0;
	}

	.resize-handle.nw,
	.resize-handle.ne,
	.resize-handle.sw,
	.resize-handle.se {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.resize-handle.nw {
		top: 0;
		left: 0;
		cursor: nwse-resize;
	}
	.resize-handle.ne {
		top: 0;
		right: 0;
		cursor: nesw-resize;
	}
	.resize-handle.sw {
		bottom: 0;
		left: 0;
		cursor: nesw-resize;
	}
	.resize-handle.se {
		bottom: 0;
		right: 0;
		cursor: nwse-resize;
	}

	.properties-panel {
		position: absolute;
		width: 320px;
		max-height: 300px;
		background-color: white;
		border: 2px solid #ddd;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 100;
		display: flex;
		flex-direction: column;
		will-change: transform;
	}

	.properties-panel.minimized {
		max-height: 50px;
		width: auto;
		min-width: 200px;
	}

	.properties-panel.minimized .properties-content {
		display: none;
	}

	.properties-panel.dragging {
		cursor: grabbing;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
		transition: box-shadow 0.2s;
	}

	.properties-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px;
		touch-action: none;
		background-color: #f8f8f8;
		border-bottom: 1px solid #ddd;
		cursor: move;
		user-select: none;
		flex-shrink: 0;
	}

	.properties-header h3 {
		margin: 0;
		font-size: 18px;
		color: #333;
	}

	.header-buttons {
		display: flex;
		gap: 4px;
	}

	.minimize-btn {
		background: none;
		border: none;
		font-size: 18px;
		color: #666;
		cursor: pointer;
		padding: 0;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.minimize-btn:hover {
		background-color: #e0e0e0;
		color: #333;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 24px;
		color: #666;
		cursor: pointer;
		padding: 0;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.close-btn:hover {
		background-color: #e0e0e0;
		color: #333;
	}

	.properties-content {
		padding: 16px;
		overflow-y: auto;
		flex: 1;
		min-height: 0;
	}

	.property-group {
		margin-bottom: 16px;
	}

	.property-group label {
		display: block;
		margin-bottom: 4px;
		font-weight: 500;
		font-size: 14px;
		color: #555;
	}

	.property-group input,
	.property-group textarea {
		width: 100%;
		padding: 8px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-family: inherit;
		font-size: 14px;
		box-sizing: border-box;
	}

	.property-group textarea {
		min-height: 80px;
		resize: vertical;
	}

	.property-group input[type='color'] {
		height: 40px;
		cursor: pointer;
	}
</style>
