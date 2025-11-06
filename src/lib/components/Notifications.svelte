<script>
	import { SvelteSet } from 'svelte/reactivity';
	import { onDestroy } from 'svelte';

	let { notifications } = $props();

	let seenNotifications = new SvelteSet();

	let markNotificationsAsReadTimeout;

	function markAsRead(seenNotifications) {
		if (seenNotifications.size > 0) {
			const ids = Array.from(seenNotifications).map((n) => n.id);
			try {
				fetch('/api/mark-notifications-as-read', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ notificationIds: ids })
				});
				seenNotifications.delete(ids);
			} catch (e) {
				console.error('Failed to mark notifications as read:', e);
			}
		}
	}

	function intersectionObserver(node, notification, index) {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !seenNotifications.has(notification)) {
						seenNotifications.add(notification);
						if (markNotificationsAsReadTimeout) {
							clearTimeout(markNotificationsAsReadTimeout);
						}
						markNotificationsAsReadTimeout = setTimeout(() => {
							markAsRead(seenNotifications);
						}, 2000);
					}
				});
			},
			{ threshold: 1 }
		);
		observer.observe(node);
		return {
			destroy() {
				observer.disconnect();
			}
		};
	}

	function parseBasicMarkdown(markdownText) {
		let htmlText = markdownText;

		// Escape HTML characters
		htmlText = htmlText
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#x27;')
			.replace(/\//g, '&#x2F;');

		// Strikethrough: ~~text~~ -> <del>text</del> (or <s>text</s>)
		// The regex /~~(.*?)~~/g finds all instances of text wrapped in double tildes.
		htmlText = htmlText.replace(/~~(.*?)~~/g, '<del>$1</del>');

		// Bold: **text** or __text__ -> <strong>text</strong>
		// The regex /(\*\*|__)(.*?)\1/g finds text wrapped in double asterisks or double underscores.
		htmlText = htmlText.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

		// Italic: *text* or _text_ -> <em>text</em>
		// The regex /(\*|_)(.*?)\1/g finds text wrapped in single asterisks or single underscores.
		htmlText = htmlText.replace(/([*_])(.*?)\1/g, '<em>$2</em>');

		return htmlText;
	}

	onDestroy(() => {
		if (markNotificationsAsReadTimeout) {
			clearTimeout(markNotificationsAsReadTimeout);
		}
		markAsRead(seenNotifications);
	});
</script>

{#if notifications.length !== 0}
	<div>
		<h4>{notifications.length} Notifications</h4>
		<ul>
			{#each notifications as notification (notification.id)}
				<li class="notification-item" use:intersectionObserver={notification}>
					{@html parseBasicMarkdown(notification.message)}
				</li>
			{/each}
		</ul>
	</div>
{/if}

<style>
	h4 {
		color: white;
		padding-left: 10px;
		margin-bottom: 10px;
	}
	ul {
		max-height: 200px;
		overflow-y: auto;
		scroll-behavior: smooth;
		padding: 0;
		margin: 0;
		width: 300px;
		max-width: 300px;
	}

	.notification-item {
		color: white;
		padding: 10px;
		font-size: 16px;
		word-wrap: break-word;
		overflow-wrap: break-word;
		max-width: 100%;
	}
</style>
