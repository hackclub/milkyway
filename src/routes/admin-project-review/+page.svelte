<script lang="ts">
	import { onMount } from 'svelte';
	let projects = $state<any[]>([]);
	let loading = $state(true);
	let error = $state('');
	let submittingById = $state<Record<string, boolean>>({});
	let stats = $state({
		projectsLeft: 0,
		projectsWithOneReviewer: 0,
		projectsWithTwoReviewers: 0
	});
	let expandedPrior = $state<Record<string, boolean>>({});
	let leaderboardOpen = $state(false);
	let leaderboardScope = $state<'all' | '7d' | '24h'>('all');
	let leaderboardLoading = $state(false);
	let leaderboardError = $state('');
	let leaderboard = $state<Array<{ reviewerId: string; username: string; reviews: number }>>([]);

	let formById = $state<Record<string, {
		coinsAwarded: number;
		notesToUser: string;
		needFix: boolean;
		dbHours: number | '';
		dbJustification: string;
		success: string;
		error: string;
	}>>({});

	function normalizeUrl(url: string) {
		const raw = String(url || '').trim();
		if (!raw) return '';
		if (/^https?:\/\//i.test(raw)) return raw;
		return `https://${raw}`;
	}

	function togglePriorExpand(id: string) {
		expandedPrior = { ...expandedPrior, [id]: !expandedPrior[id] };
	}

	async function loadLeaderboard() {
		leaderboardLoading = true;
		leaderboardError = '';
		try {
			const res = await fetch(`/api/reviewer/projects/leaderboard?scope=${leaderboardScope}`);
			const data = await res.json();
			if (!res.ok || !data.success) {
				leaderboardError = data?.error || 'failed to load leaderboard';
				leaderboard = [];
				return;
			}
			leaderboard = Array.isArray(data.leaderboard) ? data.leaderboard : [];
		} catch (e) {
			console.error(e);
			leaderboardError = 'failed to load leaderboard';
			leaderboard = [];
		} finally {
			leaderboardLoading = false;
		}
	}

	function initForm(projectId: string) {
		if (!formById[projectId]) {
			formById[projectId] = {
				coinsAwarded: 0,
				notesToUser: '',
				needFix: false,
				dbHours: '',
				dbJustification: '',
				success: '',
				error: ''
			};
		}
	}

	async function loadNext() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/reviewer/projects/admin');
			const data = await res.json();
			if (!res.ok || !data.success) {
				error = data?.error || 'failed to fetch next project';
				projects = [];
				return;
			}
			projects = Array.isArray(data.projects) ? data.projects : [];
			if (data.stats) {
				stats = {
					projectsLeft: data.stats.projectsLeft ?? 0,
					projectsWithOneReviewer: data.stats.projectsWithOneReviewer ?? 0,
					projectsWithTwoReviewers: data.stats.projectsWithTwoReviewers ?? 0
				};
			}
			for (const p of projects) {
				initForm(String(p.id));
			}
		} catch (e) {
			console.error(e);
			error = 'failed to fetch next project';
		} finally {
			loading = false;
		}
	}

	async function finishProject(projectId: string) {
		if (!projectId || submittingById[projectId]) return;
		submittingById[projectId] = true;
		initForm(projectId);
		formById[projectId].error = '';
		formById[projectId].success = '';
		try {
			const res = await fetch('/api/reviewer/projects/admin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					submissionId: projectId,
					action: 'finish',
					coinsAwarded: Number(formById[projectId].coinsAwarded || 0),
					notesToUser: formById[projectId].notesToUser,
					needFix: !!formById[projectId].needFix,
					dbHours:
						formById[projectId].dbHours === '' ? null : Number(formById[projectId].dbHours),
					dbJustification: formById[projectId].dbJustification
				})
			});
			const data = await res.json();
			if (!res.ok || !data.success) {
				formById[projectId].error = data?.error || 'failed to save admin review';
				return;
			}
			formById[projectId].success = 'admin review saved';
			await loadNext();
		} catch (e) {
			console.error(e);
			formById[projectId].error = 'failed to save admin review';
		} finally {
			submittingById[projectId] = false;
		}
	}

	async function skipProject(projectId: string) {
		if (!projectId) return;
		await fetch('/api/reviewer/projects/admin', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ submissionId: projectId, action: 'skip' })
		});
		await loadNext();
	}

	onMount(() => {
		void loadNext();
		void loadLeaderboard();
	});
</script>

<svelte:head>
	<title>Admin Project Review ✦ Milkyway</title>
</svelte:head>

<main class="page">
	<h1>admin project review dashboard</h1>
	<p class="subtitle">queue order: 2 passes first, then 1 pass, then 0 pass.</p>

	<section class="stats-row" aria-label="queue stats">
		<div class="stat">
			<div class="stat-label">projects left</div>
			<div class="stat-value">{stats.projectsLeft}</div>
		</div>
		<div class="stat">
			<div class="stat-label">proj w 1 reviewer</div>
			<div class="stat-value">{stats.projectsWithOneReviewer}</div>
		</div>
		<div class="stat">
			<div class="stat-label">proj w 2 reviewers</div>
			<div class="stat-value">{stats.projectsWithTwoReviewers}</div>
		</div>
	</section>

	<section class="card">
		<button type="button" class="dropdown-toggle" onclick={() => (leaderboardOpen = !leaderboardOpen)}>
			{leaderboardOpen ? '▼ reviewer leaderboard' : '▶ reviewer leaderboard'}
		</button>
		{#if leaderboardOpen}
			<div class="leaderboard-panel">
				<div class="leaderboard-controls">
					<label for="admin-lb-scope">time range</label>
					<select
						id="admin-lb-scope"
						bind:value={leaderboardScope}
						onchange={() => {
							void loadLeaderboard();
						}}
					>
						<option value="all">all time</option>
						<option value="7d">past 7 days</option>
						<option value="24h">past 24h</option>
					</select>
				</div>
				{#if leaderboardLoading}
					<p class="muted">loading leaderboard...</p>
				{:else if leaderboardError}
					<p class="bad">{leaderboardError}</p>
				{:else if leaderboard.length === 0}
					<p class="muted">no reviews in this time range yet.</p>
				{:else}
					<div class="leaderboard-list">
						{#each leaderboard as row, i (row.reviewerId)}
							<div class="leaderboard-row">
								<span class="rank">#{i + 1}</span>
								<span class="name">{row.username}</span>
								<span class="count">{row.reviews} reviews</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</section>

	{#if loading}
		<div class="card">loading...</div>
	{:else if error}
		<div class="card error">{error}</div>
	{:else if projects.length === 0}
		<div class="card">no projects in admin queue.</div>
	{:else}
		{#each projects as project (project.id)}
			<section class="card">
				<h2>{project.project.name}</h2>
				<p><strong>review passes:</strong> {project.passCount}/2</p>
				<p>{project.project.description}</p>
				<div class="hours-grid">
					<div class="hour-card">
						<div class="hour-label">code</div>
						<div class="hour-total">{project.project.hackatimeHours}h</div>
						<div class="hour-new">
							+{Number(project.project.newHackatimeHoursSinceLastApproved || 0)}h since last ship
						</div>
					</div>
					<div class="hour-card">
						<div class="hour-label">art</div>
						<div class="hour-total">{project.project.artHours}h</div>
						<div class="hour-new">
							+{Number(project.project.newArtHoursSinceLastApproved || 0)}h since last ship
						</div>
					</div>
					<div class="hour-card total">
						<div class="hour-label">total</div>
						<div class="hour-total">{project.project.totalHours}h</div>
						<div class="hour-new">
							+{Number(project.project.newTotalHoursSinceLastApproved || 0)}h since last ship
						</div>
					</div>
				</div>
				<p><strong>submitter email:</strong> {project.user?.email || '—'}</p>
				<div class="submission-comments">
					<p><strong>not made by submitter:</strong> {project.submission?.additionalComments?.notMadeBy || '—'}</p>
					<p><strong>how to play:</strong> {project.submission?.additionalComments?.howToPlay || '—'}</p>
					<p><strong>since last submission:</strong> {project.submission?.additionalComments?.sinceLastSubmission || '—'}</p>
				</div>
				<div class="hackatime-names">
					<strong>linked hackatime project names:</strong>
					{#if project.project.hackatimeProjectNames && project.project.hackatimeProjectNames.length > 0}
						<ul>
							{#each project.project.hackatimeProjectNames as name}
								<li>{name}</li>
							{/each}
						</ul>
					{:else}
						<span class="muted"> none linked on this project egg</span>
					{/if}
				</div>
				<div class="links">
					{#if project.project.shipURL}
						<a href={normalizeUrl(project.project.shipURL)} target="_blank" rel="noopener noreferrer">{project.project.shipURL}</a>
					{/if}
					{#if project.project.githubURL}
						<a href={normalizeUrl(project.project.githubURL)} target="_blank" rel="noopener noreferrer">{project.project.githubURL}</a>
					{/if}
					{#if project.user.profileUrl}<a href={project.user.profileUrl}>view profile</a>{/if}
				</div>
				{#if project.project.image}<img class="shot" src={project.project.image} alt="project screenshot" />{/if}
			</section>

			<section class="card">
				<h3>project reviewer outputs</h3>
				<div class="mini">
					<h4>reviewer 1</h4>
					<p><strong>hours feel:</strong> {project.reviews.review1.estimatedHoursFeel || '—'}</p>
					<p><strong>coins:</strong> {project.reviews.review1.coins}</p>
					<p><strong>feedback:</strong> {project.reviews.review1.feedback || '—'}</p>
					<p><strong>suspicious:</strong> {project.reviews.review1.suspicious ? 'yes' : 'no'}</p>
				</div>
				<div class="mini">
					<h4>reviewer 2</h4>
					<p><strong>hours feel:</strong> {project.reviews.review2.estimatedHoursFeel || '—'}</p>
					<p><strong>coins:</strong> {project.reviews.review2.coins}</p>
					<p><strong>feedback:</strong> {project.reviews.review2.feedback || '—'}</p>
					<p><strong>suspicious:</strong> {project.reviews.review2.suspicious ? 'yes' : 'no'}</p>
				</div>
				<p><strong>flagged suspicious overall:</strong> {project.isSuspicious ? 'yes' : 'no'}</p>
			</section>

			<section class="card">
				<h3>artlog overview (latest 5)</h3>
				{#if !Array.isArray(project.artlogs) || project.artlogs.length === 0}
					<p>no linked artlogs</p>
				{:else}
					{#each project.artlogs as a}
						<div class="mini">
							<div>{a.hours}h logged {#if a.approvedHours !== null}· {a.approvedHours}h approved{/if}</div>
							<div>{a.description || 'no description'}</div>
							<div class="links">
								{#if a.proof}
									<a href={normalizeUrl(a.proof)} target="_blank" rel="noopener noreferrer">proof</a>
								{/if}
								{#if a.image}
									<a href={normalizeUrl(a.image)} target="_blank" rel="noopener noreferrer">image</a>
								{/if}
							</div>
						</div>
					{/each}
				{/if}
			</section>

			<section class="card">
				<h3>prior submissions</h3>
				{#if !Array.isArray(project.previousSubmissions) || project.previousSubmissions.length === 0}
					<p class="muted">no prior submissions on file for this project yet.</p>
				{:else}
					{#each project.previousSubmissions as s (s.id)}
						<div class="prior-block">
							<button
								type="button"
								class="prior-summary"
								onclick={() => togglePriorExpand(s.id)}
								aria-expanded={!!expandedPrior[s.id]}
							>
								<div class="prior-top">
									<span class="prior-chevron" aria-hidden="true">{expandedPrior[s.id] ? '▼' : '▶'}</span>
									<div class="prior-stats">
										<span class="prior-date">{s.created || s.id}</span>
										<span><strong>{Number(s.hoursLogged ?? 0)}h</strong> at submit</span>
										<span><strong>{Number(s.coinsAwarded ?? 0)}</strong> coins</span>
									</div>
								</div>
							</button>
							{#if expandedPrior[s.id]}
								<div class="prior-details">
									<p><strong>final feedback (notes to user)</strong></p>
									<pre class="prior-pre">{s.notesToUser?.trim() || '—'}</pre>
									<p><strong>since last / what changed</strong></p>
									<pre class="prior-pre">{s.sinceLastSubmission || 'not provided on that submission row'}</pre>
									<p class="prior-meta">awardingResults: {s.awardingResults || '—'} · id: {s.id}</p>
								</div>
							{/if}
						</div>
					{/each}
				{/if}
			</section>

			<section class="card">
				<h3>final admin decision</h3>
				<label>
					coins to award
					<input
						type="number"
						min="0"
						step="1"
						bind:value={formById[project.id].coinsAwarded}
						disabled={formById[project.id].needFix}
					/>
				</label>
				<label class="check">
					<input type="checkbox" bind:checked={formById[project.id].needFix} />
					needfix (mark for review; no coins awarded; removed from queues)
				</label>
				<label>
					feedback to user
					<textarea rows="5" bind:value={formById[project.id].notesToUser}></textarea>
				</label>
				<label>
					db hours (number)
					<input
						type="number"
						min="0"
						step="0.1"
						bind:value={formById[project.id].dbHours}
						disabled={formById[project.id].needFix}
					/>
				</label>
				<label>
					db justification (text)
					<textarea
						rows="3"
						bind:value={formById[project.id].dbJustification}
						disabled={formById[project.id].needFix}
					></textarea>
				</label>
				{#if formById[project.id].success}<p class="ok">{formById[project.id].success}</p>{/if}
				{#if formById[project.id].error}<p class="bad">{formById[project.id].error}</p>{/if}
				<div class="actions">
					<button type="button" onclick={() => skipProject(project.id)} disabled={!!submittingById[project.id]}>
						skip and go to next
					</button>
					<button type="button" onclick={() => finishProject(project.id)} disabled={!!submittingById[project.id]}>
						{submittingById[project.id] ? 'saving...' : 'finish project'}
					</button>
				</div>
			</section>
		{/each}
	{/if}
</main>

<style>
	.page { max-width: 900px; margin: 0 auto; padding: 20px 12px 40px; color: #222; }
	.stats-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 10px;
		margin-bottom: 16px;
	}
	.stat {
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 10px 12px;
		background: #fafafa;
	}
	.stat-label { font-size: 0.75rem; color: #666; text-transform: lowercase; }
	.stat-value { font-size: 1.25rem; font-weight: 700; color: #222; }
	.subtitle { color: #666; margin-top: -6px; }
	.card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin: 12px 0; background: #fff; }
	.error { color: #a00; }
	.links { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
	.shot { margin-top: 10px; max-width: 100%; border: 1px solid #ddd; border-radius: 6px; }
	.hours-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 10px;
		margin: 10px 0;
	}
	.hour-card {
		border: 1px solid #e2e2e2;
		border-radius: 8px;
		padding: 8px 10px;
		background: #fafafa;
	}
	.hour-card.total {
		border-color: #cfd8ff;
		background: #f6f8ff;
	}
	.hour-label {
		font-size: 0.78rem;
		color: #666;
		text-transform: lowercase;
	}
	.hour-total {
		font-size: 1.15rem;
		font-weight: 700;
		color: #222;
		margin-top: 2px;
	}
	.hour-new {
		font-size: 0.8rem;
		color: #0a6b2d;
		margin-top: 4px;
	}
	.submission-comments p {
		margin: 6px 0;
	}
	.prior-block { border: 1px solid #e5e5e5; border-radius: 8px; margin: 10px 0; overflow: hidden; }
	.prior-summary {
		width: 100%;
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px 12px;
		background: #fafafa;
		border: none;
		cursor: pointer;
		font: inherit;
		color: inherit;
	}
	.prior-summary:hover { background: #f0f0f0; }
	.prior-top { display: flex; align-items: flex-start; gap: 8px; }
	.prior-chevron { color: #888; font-size: 0.75rem; flex-shrink: 0; margin-top: 2px; }
	.prior-stats {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 14px;
		font-size: 0.9rem;
	}
	.prior-date { color: #666; font-size: 0.8rem; }
	.prior-details {
		padding: 0 12px 12px 12px;
		border-top: 1px solid #eee;
		background: #fff;
		font-size: 0.88rem;
	}
	.prior-details p { margin: 10px 0 4px 0; }
	.prior-pre {
		margin: 0 0 8px 0;
		white-space: pre-wrap;
		font-family: inherit;
		font-size: 0.88rem;
		padding: 8px;
		background: #f9f9f9;
		border-radius: 6px;
		border: 1px solid #eee;
	}
	.prior-meta { font-size: 0.78rem; color: #888; margin-top: 8px !important; }
	.mini { padding: 8px; border: 1px solid #eee; border-radius: 6px; margin: 8px 0; }
	textarea, input[type='number'] { width: 100%; box-sizing: border-box; margin-top: 6px; margin-bottom: 10px; }
	.actions { display: flex; gap: 8px; flex-wrap: wrap; }
	.check { display: flex; gap: 8px; align-items: center; margin: 8px 0; }
	.dropdown-toggle {
		border: 0;
		padding: 0;
		background: transparent;
		cursor: pointer;
		font: inherit;
		font-size: 0.85rem;
		color: #555;
	}
	.leaderboard-panel { margin-top: 10px; }
	.leaderboard-controls {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}
	.leaderboard-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.leaderboard-row {
		display: grid;
		grid-template-columns: 56px 1fr auto;
		gap: 8px;
		padding: 6px 8px;
		border: 1px solid #eee;
		border-radius: 6px;
		background: #fff;
	}
	.rank { color: #666; }
	.name { font-weight: 600; }
	.count { color: #333; }
	.ok { color: #0a7; }
	.bad { color: #a00; }
	.hackatime-names { margin-top: 8px; font-size: 0.9rem; }
	.hackatime-names ul { margin: 6px 0 0 1.2rem; padding: 0; }
	.muted { color: #777; font-style: italic; }
</style>
