<script>
	import Tooltip from '$lib/components/Tooltip.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {boolean} [milkywaySubmissionClosed]
	 * @property {string | null} [milkywayExtensionDeadline] - ISO end of extension day (UTC)
	 */

	/** @type {Props} */
	let { milkywaySubmissionClosed = false, milkywayExtensionDeadline = null } = $props();

	const extensionHelpText =
		"if you need an extension to submit a project, don't worry! ask tongyu and explain why you need it, then keep working on your project. once the extension is approved, your hours will still count :)";

	/** @param {string | null | undefined} iso */
	function formatDeadline(iso) {
		if (!iso) return '';
		try {
			const d = new Date(iso);
			return new Intl.DateTimeFormat(undefined, {
				dateStyle: 'long',
				timeZone: 'UTC'
			}).format(d);
		} catch {
			return '';
		}
	}

	let deadlineLabel = $derived(formatDeadline(milkywayExtensionDeadline));
</script>

{#if milkywaySubmissionClosed}
	<div class="mw-dock">
		<div class="mw-note" role="status" aria-live="polite">
			<h3 class="mw-note__title">milkyway has ended!</h3>
			<p class="mw-note__text">
				you can't make new projects or ship anymore, but you can still spend your coins in the shop and get
				payouts from reviews.
			</p>
			{#if milkywayExtensionDeadline}
				<p class="mw-note__text mw-note__muted">(your extension was through {deadlineLabel}, utc.)</p>
			{/if}
			<p class="mw-note__dm mw-note__dm--tooltip">
				<Tooltip text={extensionHelpText} position="bottom">
					<span class="mw-note__dm-hit">need an extension? dm tongyu on slack</span>
				</Tooltip>
			</p>
		</div>
	</div>
{:else if milkywayExtensionDeadline}
	<div class="mw-dock">
		<div class="mw-note mw-note--soft" role="status" aria-live="polite">
			<h3 class="mw-note__title">heads up — you've got extra time</h3>
			<p class="mw-note__text">
				most people's submissions are closed, but you can finish and ship until end of day
				<strong>{deadlineLabel}</strong> (utc). shop stays open after.
			</p>
			<p class="mw-note__dm">something weird? dm tongyu!</p>
		</div>
	</div>
{/if}

<style>
	/* Fixed layer above the room (eggs / room use high z-index); keep under full-screen overlays (~99999). */
	.mw-dock {
		position: fixed;
		top: 10px;
		left: 0;
		right: 0;
		z-index: 10050;
		display: flex;
		justify-content: center;
		padding: 0 12px;
		box-sizing: border-box;
		pointer-events: none;
	}

	.mw-dock .mw-note {
		pointer-events: auto;
	}

	/* Same ballpark as Announcements.svelte `.announcement-content` + debt-box */

	.mw-note {
		max-width: min(22rem, calc(100vw - 24px));
		margin: 0;
		padding: 10px 12px;
		border-radius: 6px;
		background-color: #edd4d4;
		border: 3px solid #e6819f;
		font-family: Futura, sans-serif;
		color: #444;
	}

	.mw-note--soft {
		background-color: #fbf2bf;
		border-color: #f7c881;
	}

	.mw-note__title {
		margin: 0 0 6px 0;
		font-size: 0.88em;
		font-weight: 600;
		color: #444;
	}

	.mw-note__text {
		margin: 0 0 6px 0;
		font-size: 0.78em;
		line-height: 1.45;
		font-weight: 500;
	}

	.mw-note__text strong {
		font-weight: 600;
		color: #444;
	}

	.mw-note__muted {
		font-size: 0.72em;
		color: #666;
		font-style: italic;
		margin-top: 4px;
	}

	.mw-note__dm {
		margin: 8px 0 0 0;
		padding-top: 8px;
		border-top: 1px solid rgba(230, 129, 159, 0.45);
		font-size: 0.72em;
		line-height: 1.35;
		color: #555;
	}

	.mw-note--soft .mw-note__dm {
		border-top-color: rgba(247, 200, 129, 0.7);
	}

	.mw-note__dm-hit {
		cursor: help;
		text-decoration: underline dotted;
		text-underline-offset: 2px;
	}

	/*
	 * Same palette as Tooltip.svelte (#333 / white, 6px radius).
	 * Only size + position tweaked so longer copy stays readable below the link.
	 */
	:global(.mw-note__dm--tooltip .tooltip-container) {
		display: inline-block;
		max-width: 100%;
	}

	:global(.mw-note__dm--tooltip .tooltip-container .tooltip) {
		z-index: 10060;
		top: calc(100% + 6px);
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.78rem;
		line-height: 1.45;
		font-family: Futura, system-ui, sans-serif;
		text-align: center;
		padding: 8px 12px;
		min-width: 11rem;
		max-width: min(17rem, calc(100vw - 40px));
		background-color: #333;
		color: white;
		border-radius: 6px;
		border: none;
		box-shadow: none;
	}

	:global(.mw-note__dm--tooltip .tooltip-container .tooltip::after) {
		bottom: 100%;
		top: auto;
		left: 50%;
		margin-left: -5px;
		border-width: 5px;
		border-style: solid;
		border-color: transparent transparent #333 transparent;
	}
</style>
