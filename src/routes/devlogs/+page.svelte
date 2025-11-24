<script>
	import Devlogs from '$lib/components/devlogs/Devlogs.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Devlogs ✦ Milkyway</title>
</svelte:head>

<main>
	<Devlogs
		isFeed={true}
		devlogs={data.devlogs || []}
		totalCount={data.totalCount || 0}
		page={data.page || 1}
		limit={data.limit || 20}
		sort={data.sort || 'newest'}
		error={data.error}
		user={data.user}
	/>
	<a href="/home" class="back-button">← Back to Home</a>
</main>

<style>
	main {
		background-image: url('/milkyway bg.png');
		background-size: cover;
		background-position: center;
		height: 100%;
		width: 100%;
		box-sizing: border-box;
		position: absolute;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 40px 0;
	}

	.back-button {
		position: fixed;
		top: 30px;
		left: 30px;
		background: rgba(255, 255, 255, 0.2);
		color: white;
		padding: 12px 24px;
		border-radius: 8px;
		border: 2px solid rgba(255, 255, 255, 0.5);
		text-decoration: none;
		font-weight: 600;
		transition: all 0.2s ease;
		z-index: 100;
		backdrop-filter: blur(10px);
	}

	.back-button:hover {
		background: rgba(255, 255, 255, 0.3);
		border-color: rgba(255, 255, 255, 0.8);
	}
</style>
