<script>
	import { onMount } from 'svelte';

	const { terminalData, saveTerminal } = $props();

	let terminal;
	let inputLine = $state('');
	let history = $state(terminalData.history || []);
	let commandHistory = $state([]);
	let historyIndex = $state(-1);
	let isLoading = $state(false);

	let gameUrl = $state(terminalData?.gameUrl || '');

	let vfs = $state(
		terminalData?.vfs || {
			'/': { type: 'dir', children: ['home'] },
			'/home': { type: 'dir', children: ['readme.txt', 'game.url'] },
			'/home/readme.txt': {
				type: 'file',
				content: 'hai!!\nType "help" for available commands.'
			},
			'/home/game.url': {
				type: 'file',
				content: `READONLY: This file is used by the arcade cabinet to determine which game to load. Use the 'setgame' command to change the game URL.


${gameUrl}`
			}
		}
	);

	let currentDir = $state(terminalData?.currentDir || '/home');
	let username = $state(terminalData?.name || 'player');

	const commands = {
		cat: {
			description: 'Display file contents',
			execute: (args) => {
				if (!args[0]) return 'cat: missing file operand';

				const path = resolvePath(args[0]);
				const file = vfs[path];

				if (!file) return `cat: ${args[0]}: No such file or directory`;
				if (file.type !== 'file') return `cat: ${args[0]}: Is a directory`;

				return file.content;
			}
		},

		cd: {
			description: 'Change directory',
			execute: (args) => {
				if (!args[0]) {
					currentDir = '/home';
					return null;
				}

				const path = resolvePath(args[0]);
				const dir = vfs[path];

				if (!dir) return `cd: ${args[0]}: No such file or directory`;
				if (dir.type !== 'dir') return `cd: ${args[0]}: Not a directory`;

				currentDir = path;
				return null;
			}
		},

		clear: {
			description: 'Clear the terminal',
			execute: () => {
				history = [];
				return null;
			}
		},

		cowsay: {
			description: 'Make a silly little cow say whatever you want!!',
			execute: (args) => {
				const message = args.join(' ') || 'Moo!';
				const border = '-'.repeat(message.length + 2);
				return ` ${border}\n< ${message} >\n ${border}\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||`;
			}
		},

		echo: {
			description: 'Display a line of text',
			execute: (args) => args.join(' ')
		},

		help: {
			description: 'Show available commands',
			execute: () => {
				const commandList = Object.entries(commands)
					.map(([cmd, info]) => `  ${cmd.padEnd(12)} - ${info.description}`)
					.join('\n');
				return `Available commands:\n${commandList}`;
			}
		},

		ls: {
			description: 'List directory contents',
			execute: (args) => {
				const path = args[0] ? resolvePath(args[0]) : currentDir;
				const dir = vfs[path];

				if (!dir) return `ls: cannot access '${args[0] || path}': No such file or directory`;
				if (dir.type !== 'dir') return `ls: cannot access '${args[0] || path}': Not a directory`;

				return dir.children
					.map((child) => {
						const childPath = path === '/' ? `/${child}` : `${path}/${child}`;
						const isDir = vfs[childPath]?.type === 'dir';
						return isDir ? `${child}/` : `${child}`;
					})
					.join('\n');
			}
		},

		mkdir: {
			description: 'Create a new directory',
			execute: (args) => {
				if (!args[0]) return 'mkdir: missing operand';

				const path = resolvePath(args[0]);
				if (vfs[path]) return `mkdir: cannot create directory '${args[0]}': File exists`;

				const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
				const dirName = path.substring(path.lastIndexOf('/') + 1);
				const parent = vfs[parentPath];

				if (!parent)
					return `mkdir: cannot create directory '${args[0]}': No such file or directory`;
				if (parent.type !== 'dir')
					return `mkdir: cannot create directory '${args[0]}': Not a directory`;

				vfs[path] = { type: 'dir', children: [] };
				parent.children.push(dirName);
				return null;
			}
		},

		pwd: {
			description: 'Print working directory',
			execute: () => currentDir
		},

		rm: {
			description: 'Remove files or directories (or even / 😳)',
			execute: (args) => {
				if (!args[0]) return 'rm: missing operand';

				const path = resolvePath(args[0]);
				const item = vfs[path];

				if (path === '/') return 'nice try';

				if (path.restrictions && path.restrictions.includes('readonly'))
					return `rm: cannot remove '${args[0]}': Permission denied`;

				if (!item) return `rm: cannot remove '${args[0]}': No such file or directory`;
				if (item.type === 'dir' && item.children.length > 0)
					return `rm: cannot remove '${args[0]}': Directory not empty`;

				const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
				const itemName = path.substring(path.lastIndexOf('/') + 1);
				const parent = vfs[parentPath];

				parent.children = parent.children.filter((child) => child !== itemName);
				delete vfs[path];
				return null;
			}
		},

		setgame: {
			description: 'Set the game for the arcade cabinet',
			execute: (args) => {
				if (!args[0]) return 'setgame: missing game url parameter';

				let newGameUrl;

				try {
					newGameUrl = new URL(args[0]);
				} catch {
					return 'setgame: Invaid URL';
				}

				if (newGameUrl.protocol !== 'https:') {
					return 'setgame: invalid URL. Please provide a valid https URL.';
				} else {
					gameUrl = newGameUrl.toString();
					console.log(`gameUrl: ${gameUrl}`);
					vfs['/home/game.url'].content =
						`READONLY: This file is used by the arcade cabinet to determine which game to load. Use the 'setgame' command to change the game URL.


${gameUrl}`;
				}

				return null;
			}
		},

		touch: {
			description: 'Create a new file',
			execute: (args) => {
				if (!args[0]) return 'touch: missing file operand';

				const path = resolvePath(args[0]);
				if (vfs[path]) return "touch: cannot touch '${args[0]}': File exists";

				const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
				const fileName = path.substring(path.lastIndexOf('/') + 1);
				const parent = vfs[parentPath];

				if (!parent) return `touch: cannot touch '${args[0]}': No such file or directory`;
				if (parent.type !== 'dir') return `touch: cannot touch '${args[0]}': Not a directory`;

				vfs[path] = { type: 'file', content: '' };
				parent.children.push(fileName);
				return null;
			}
		}
	};

	function resolvePath(path) {
		if (path.startsWith('/')) return path;
		if (path === '..') {
			if (currentDir === '/') return '/';
			return currentDir.substring(0, currentDir.lastIndexOf('/')) || '/';
		}
		if (path === '.') return currentDir;

		return currentDir === '/' ? `/${path}` : `${currentDir}/${path}`;
	}

	onMount(() => {
		if (terminalData?.history) {
			history = terminalData.history;
		} else {
			addToHistory('system', 'Successfully connected to COM1');
			addToHistory('system', 'Use "setgame" to point the cabinet to your game!');
			addToHistory('system', '');
		}

		if (terminal) {
			terminal.scrollTop = terminal.scrollHeight;
		}
	});

	function addToHistory(type, content, command = null) {
		history = [...history, { type, content, command }];
		setTimeout(() => {
			if (terminal) terminal.scrollTop = terminal.scrollHeight;
		}, 0);
	}

	function handleSubmit(e) {
		e.preventDefault();
		const command = inputLine.trim();

		if (!command) return;

		addToHistory('input', command);
		commandHistory = [...commandHistory, command];
		historyIndex = -1;

		const [cmd, ...args] = command.split(' ');
		const commandFunc = commands[cmd.toLowerCase()];

		if (commandFunc) {
			const output = commandFunc.execute(args);
			if (output !== null && output !== '') {
				addToHistory('output', output);
			}
		} else {
			addToHistory('error', `${cmd}: command not found. Type "help" for available commands.`);
		}

		inputLine = '';
	}

	function handleKeyDown(e) {
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (commandHistory.length === 0) return;

			if (historyIndex === -1) {
				historyIndex = commandHistory.length - 1;
			} else if (historyIndex > 0) {
				historyIndex--;
			}
			inputLine = commandHistory[historyIndex];
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (historyIndex === -1) return;

			if (historyIndex < commandHistory.length - 1) {
				historyIndex++;
				inputLine = commandHistory[historyIndex];
			} else {
				historyIndex = -1;
				inputLine = '';
			}
		}
	}

	async function handleSave() {
		isLoading = true;
		await saveTerminal({
			vfs,
			currentDir,
			username,
			history: history.slice(-50),
			gameUrl: gameUrl
		});
		isLoading = false;
	}
</script>

<div class="cabinet-settings">
	<div class="terminal-container">
		<div class="terminal-header">
			<button class="save-btn" onclick={handleSave} disabled={isLoading}>
				{isLoading ? 'Saving...' : 'Save'}
			</button>
		</div>

		<div class="terminal-body" bind:this={terminal}>
			{#each history as entry}
				{#if entry.type === 'system'}
					<div class="line system">{entry.content}</div>
				{:else if entry.type === 'input'}
					<div class="line input">
						<span class="prompt">{username}@cabinet:{currentDir}$</span>
						<span class="command">{entry.content}</span>
					</div>
				{:else if entry.type === 'output'}
					<div class="line output">{entry.content}</div>
				{:else if entry.type === 'error'}
					<div class="line error">{entry.content}</div>
				{/if}
			{/each}

			<form class="input-line" onsubmit={handleSubmit}>
				<span class="prompt">{username}@cabinet:{currentDir}$</span>
				<input
					type="text"
					bind:value={inputLine}
					onkeydown={handleKeyDown}
					class="terminal-input"
					autocomplete="off"
					spellcheck="false"
					autofocus
				/>
			</form>
		</div>
	</div>
</div>

<style>
	.cabinet-settings {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 16px;
	}

	.terminal-container {
		width: 100%;
		max-width: 900px;
		height: 600px;
		background: #fbf2bf;
		border: 4px solid #f7c881;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		font-family: 'Courier New', monospace;
		overflow: hidden;
	}

	.terminal-header {
		background: #fbf2bf;
		border-bottom: 2px solid #f7c881;
		padding: 8px 12px;
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}

	.save-btn {
		background: #51cf66;
		color: white;
		border: 3px solid #40a653;
		padding: 8px 20px;
		border-radius: 8px;
		font-family: 'Futura', sans-serif;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.9rem;
	}

	.save-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}

	.save-btn:disabled {
		background: #a5d6a7;
		border-color: #81c784;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.terminal-body {
		flex: 1;
		padding: 16px;
		overflow-y: auto;
		background: #000;
		color: #51cf66;
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.terminal-body::-webkit-scrollbar {
		width: 8px;
	}

	.terminal-body::-webkit-scrollbar-track {
		background: #0d0d0d;
	}

	.terminal-body::-webkit-scrollbar-thumb {
		background: #51cf66;
		border-radius: 4px;
	}

	.line {
		margin-bottom: 4px;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	.line.system {
		color: #4fc3f7;
	}

	.line.error {
		color: #ff6b6b;
	}

	.line.output {
		color: #51cf66;
	}

	.prompt {
		color: #ffd93d;
		margin-right: 8px;
		font-weight: bold;
	}

	.command {
		color: #ffffff;
	}

	.input-line {
		display: flex;
		align-items: center;
		margin-top: 8px;
	}

	.terminal-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		color: #ffffff;
		font-family: 'Courier New', monospace;
		font-size: 0.95rem;
		caret-color: #51cf66;
	}

	.terminal-input::selection {
		background: #51cf66;
		color: #000;
	}

	@media (max-width: 768px) {
		.cabinet-settings {
			padding: 8px;
		}

		.terminal-container {
			max-width: 100%;
			height: 500px;
			border-width: 3px;
		}

		.terminal-body {
			padding: 12px;
			font-size: 0.85rem;
		}

		.save-btn {
			padding: 6px 16px;
			font-size: 0.8rem;
		}

		.prompt {
			font-size: 0.85rem;
		}
	}

	@media (max-width: 480px) {
		.terminal-container {
			height: 400px;
		}

		.terminal-body {
			padding: 8px;
			font-size: 0.75rem;
		}

		.terminal-header {
			padding: 6px 8px;
		}

		.save-btn {
			padding: 4px 12px;
			font-size: 0.75rem;
		}
	}
</style>
