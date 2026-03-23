<script lang="ts">
	let project = $state<any>(null);

	const priorSubmissionTotals = $derived.by(() => {
		const list = Array.isArray(project?.previousSubmissions) ? project.previousSubmissions : [];
		let hours = 0;
		let coins = 0;
		for (const s of list) {
			hours += Number(s.hoursLogged ?? 0);
			coins += Number(s.coinsAwarded ?? 0);
		}
		return {
			count: list.length,
			hours: Math.round(hours * 100) / 100,
			coins: Math.round(coins * 100) / 100
		};
	});

	let loading = $state(true);
	let error = $state('');
	let success = $state('');
	let skippedIds = $state<string[]>([]);
	let stats = $state({
		projectsLeft: 0,
		projectsWithOneReviewer: 0,
		projectsWithTwoReviewers: 0,
		projectsYouReviewed: 0
	});

	let estimatedHoursFeel = $state('');
	let coinsAward = $state(0);
	let feedback = $state('');
	let suspicious = $state(false);
	let submitting = $state(false);
	/** which prior submission rows are expanded (details) */
	let expandedPrior = $state<Record<string, boolean>>({});

	function normalizeUrl(url: string) {
		const raw = String(url || '').trim();
		if (!raw) return '';
		if (/^https?:\/\//i.test(raw)) return raw;
		return `https://${raw}`;
	}

	function truncateText(text: string, max: number) {
		const t = String(text || '').trim();
		if (!t) return '';
		if (t.length <= max) return t;
		return t.slice(0, max).trim() + '…';
	}

	function togglePriorExpand(id: string) {
		expandedPrior = { ...expandedPrior, [id]: !expandedPrior[id] };
	}

	function coinsNeededForFullRate(p: any) {
		if (!p?.project) return 0;
		const target = Math.max(0, Number(p.project.totalHours || 0) * 10);
		const prior = Math.max(0, Number(p.project.totalCoinsPreviouslyAwarded || 0));
		const draftAward = Number(coinsAward || 0);
		return Math.max(0, Math.round((target - prior - draftAward) * 100) / 100);
	}

	function buildProjectsUrl() {
		const params = new URLSearchParams();
		if (skippedIds.length > 0) {
			params.set('exclude', skippedIds.join(','));
		}
		const q = params.toString();
		return q ? `/api/reviewer/projects?${q}` : '/api/reviewer/projects';
	}

	async function loadNext() {
		loading = true;
		error = '';
		success = '';
		try {
			const res = await fetch(buildProjectsUrl());
			const data = await res.json();
			if (!res.ok || !data.success) {
				error = data?.error || 'failed to fetch next project';
				project = null;
				return;
			}
			if (data.stats) {
				stats = {
					projectsLeft: data.stats.projectsLeft ?? 0,
					projectsWithOneReviewer: data.stats.projectsWithOneReviewer ?? 0,
					projectsWithTwoReviewers: data.stats.projectsWithTwoReviewers ?? 0,
					projectsYouReviewed: data.stats.projectsYouReviewed ?? 0
				};
			}
			project = data.project;
			expandedPrior = {};
			estimatedHoursFeel = '';
			coinsAward = 0;
			feedback = '';
			suspicious = false;
		} catch (e) {
			console.error(e);
			error = 'failed to fetch next project';
		} finally {
			loading = false;
		}
	}

	async function skipProject() {
		if (!project?.id) return;
		const id = String(project.id);
		if (!skippedIds.includes(id)) {
			skippedIds = [...skippedIds, id];
		}
		await loadNext();
	}

	async function submitAndNext() {
		if (!project?.id || submitting) return;
		submitting = true;
		error = '';
		success = '';
		try {
			const res = await fetch('/api/reviewer/projects', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					submissionId: project.id,
					action: 'submit',
					estimatedHoursFeel,
					coinsAward: Number(coinsAward || 0),
					feedback,
					suspicious
				})
			});
			const data = await res.json();
			if (!res.ok || !data.success) {
				error = data?.error || 'failed to submit review';
				return;
			}
			success = 'review submitted';
			skippedIds = skippedIds.filter((sid) => sid !== String(project.id));
			await loadNext();
		} catch (e) {
			console.error(e);
			error = 'failed to submit review';
		} finally {
			submitting = false;
		}
	}

	loadNext();
</script>

<svelte:head>
	<title>Project Review ✦ Milkyway</title>
</svelte:head>

<main class="page">
	<h1>project review dashboard</h1>
	<p class="subtitle">review one project at a time!</p>

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
		<div class="stat">
			<div class="stat-label">projects you reviewed</div>
			<div class="stat-value">{stats.projectsYouReviewed}</div>
		</div>
	</section>

	{#if loading}
		<div class="card">loading...</div>
	{:else if error}
		<div class="card error">{error}</div>
	{:else if !project}
		<div class="card">
			no pending projects for you right now (or you skipped everything in this session).
			{#if skippedIds.length > 0}
				<p class="hint">
					<button type="button" class="linkish" onclick={() => { skippedIds = []; loadNext(); }}>
						clear skipped and reload
					</button>
				</p>
			{/if}
		</div>
	{:else}
		<section class="card">
			<h2>{project.project.name}</h2>
			<p>{project.project.description}</p>
			{#if project.project.image}
				<img class="shot" src={project.project.image} alt="project screenshot" />
			{/if}
			<div class="links">
				{#if project.project.shipURL}
					<a href={normalizeUrl(project.project.shipURL)} target="_blank" rel="noopener noreferrer">
						{project.project.shipURL}
					</a>
				{/if}
				{#if project.project.githubURL}
					<a href={normalizeUrl(project.project.githubURL)} target="_blank" rel="noopener noreferrer">
						{project.project.githubURL}
					</a>
				{/if}
				{#if project.user.profileUrl}<a href={project.user.profileUrl}>view profile</a>{/if}
			</div>
			<div class="hours-grid">
				<div class="hour-card">
					<div class="hour-label">code</div>
					<div class="hour-total">{project.project.hackatimeHours}h</div>
					<div class="hour-new">+{Number(project.project.newHackatimeHoursSinceLastApproved || 0)}h since last ship</div>
				</div>
				<div class="hour-card">
					<div class="hour-label">art</div>
					<div class="hour-total">{project.project.artHours}h</div>
					<div class="hour-new">+{Number(project.project.newArtHoursSinceLastApproved || 0)}h since last ship</div>
				</div>
				<div class="hour-card total">
					<div class="hour-label">total</div>
					<div class="hour-total">{project.project.totalHours}h</div>
					<div class="hour-new">+{Number(project.project.newTotalHoursSinceLastApproved || 0)}h since last ship</div>
				</div>
			</div>
		</section>

		<section class="card">
			<h3>submission comments</h3>
			<p><strong>not made by submitter:</strong> {project.submission.additionalComments.notMadeBy || '—'}</p>
			<p><strong>how to play:</strong> {project.submission.additionalComments.howToPlay || '—'}</p>
			<p><strong>since last submission:</strong> {project.submission.additionalComments.sinceLastSubmission || '—'}</p>
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
			<p class="hint">
				newest first.
				{#if priorSubmissionTotals.count > 0}
					{priorSubmissionTotals.count} previous submission{priorSubmissionTotals.count === 1 ? '' : 's'},
					{priorSubmissionTotals.hours}h previously logged (at submit),
					{priorSubmissionTotals.coins} total coins previously earned.
					Click a row to expand final feedback and what they changed.
				{/if}
			</p>
			{#if !Array.isArray(project.previousSubmissions) || project.previousSubmissions.length === 0}
				<p class="muted">no prior submissions for this project yet.</p>
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
							<div class="prior-notes-preview">
								<strong>final notes to user:</strong>
								{truncateText(s.notesToUser, 100) || '—'}
							</div>
						</button>
						{#if expandedPrior[s.id]}
							<div class="prior-details">
								<p><strong>final feedback (notes to user)</strong></p>
								<pre class="prior-pre">{s.notesToUser?.trim() || '—'}</pre>
								<p><strong>since last / what changed</strong></p>
								<div class="prior-kv">
									<div>
										<p>{s.sinceLastSubmission || s.addnComments || 'not provided on that submission row'}</p>
									</div>
								</div>
								<p class="prior-meta">awardingResults: {s.awardingResults || '—'} · id: {s.id}</p>
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</section>

		<section class="card">
			<h3>other projects by this user</h3>
			{#if !Array.isArray(project.otherProjects) || project.otherProjects.length === 0}
				<p>none</p>
			{:else}
				{#each project.otherProjects as p}
					<div class="mini">
						<div>{p.name}</div>
						<div class="links">
							{#if p.shipURL}
								<a href={normalizeUrl(p.shipURL)} target="_blank" rel="noopener noreferrer">{p.shipURL}</a>
							{/if}
							<br/>
							{#if p.githubURL}
								<a href={normalizeUrl(p.githubURL)} target="_blank" rel="noopener noreferrer">{p.githubURL}</a>
							{/if}
						</div>
					</div>
				{/each}
			{/if}
		</section>

		<section class="card">
			<h3>your review</h3>
			<label>
				1) overall assessment (hours + quality)
				<div class="field-desc">
					this project now shows {project.project.hackatimeHours} hackatime hours and {project.project.artHours}
					art hours ({project.project.newTotalHoursSinceLastApproved || 0}h new since last ship). does that feel accurate, why/why not? describe the gameplay
					depth, amount of playable content, and overall feel. mention if it feels over-assisted by ai, copied, or
					not aligned with reported effort.
				</div>
				<div class="field-desc warning">
					before approving coins, verify:
					<br />
					- github link works and is roughly around ~1 commit/hour (or otherwise clearly demonstrates real work)
					<br />
					- gameplay/itch link works and has a playable web build or downloadable build (win/mac/linux)
					<br />
					if either check fails, award fewer or 0 coins and explain the issue in your text fields.
				</div>
				<textarea rows="5" bind:value={estimatedHoursFeel}></textarea>
			</label>
			<label>
				2) amount of coins to award
				<div class="field-desc">
					use 0 if you want to reject this submission at reviewer stage. prioritize whether the amount of hours spent is evident, and how "this is a real game" it feels.
				</div>
				<input type="number" min="0" step="1" bind:value={coinsAward} />
			</label>
			<p class="hint">
				they need {coinsNeededForFullRate(project)} more coins to reach full 10 coins/hr for this project (after
				~{project.project.totalCoinsPreviouslyAwarded ?? 0} already awarded on older submissions and the amount you
				enter above).
				put 0 to reject.
			</p>
			<label>
				3) improvement feedback
				<div class="field-desc">
					give specific feedback or comments that will be given to the hack clubber. what was cool about this game, what was fun, what was lacking and could be worked on more? any ideas for future improvement? leave this blank if rejecting project and reason is already stated.</div>
				<textarea rows="4" bind:value={feedback}></textarea>
			</label>
			<label class="check">
				<input type="checkbox" bind:checked={suspicious} />
				4) kinda suspicious (possible plagiarism / fraud hours / high ai usage). feel free to mark this liberally!
			</label>
			{#if success}<p class="ok">{success}</p>{/if}
			{#if error}<p class="bad">{error}</p>{/if}
			<div class="actions">
				<button type="button" onclick={skipProject} disabled={submitting}>skip project and go to next</button>
				<button type="button" onclick={submitAndNext} disabled={submitting}>
					{submitting ? 'submitting...' : 'submit'}
				</button>
			</div>
		</section>
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
	.linkish {
		background: none;
		border: none;
		padding: 0;
		color: #06c;
		text-decoration: underline;
		cursor: pointer;
		font: inherit;
	}
	.subtitle { color: #666; margin-top: -6px; }
	.card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin: 12px 0; background: #fff; }
	.error { color: #a00; }
	.hours-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 10px;
		margin-top: 10px;
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
	.muted { color: #777; font-size: 0.9rem; }
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
	.prior-notes-preview {
		font-size: 0.85rem;
		color: #444;
		line-height: 1.35;
		padding-left: 1.1rem;
	}
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
	.prior-kv { display: flex; flex-direction: column; gap: 10px; }
	.prior-meta { font-size: 0.78rem; color: #888; margin-top: 8px !important; }
	.links { display: flex; flex-flow: column;gap: 10px; flex-wrap: wrap; margin-top: 8px; }
	.shot { margin-top: 10px; max-width: 100%; border: 1px solid #ddd; border-radius: 6px; }
	.mini { padding: 8px; border: 1px solid #eee; border-radius: 6px; margin: 8px 0; }
	textarea, input[type='number'] { width: 100%; box-sizing: border-box; margin-top: 6px; margin-bottom: 10px; }
	.hint { font-size: 0.85rem; color: #666; margin-top: -4px; }
	.field-desc { margin-top: 6px; margin-bottom: 6px; font-size: 0.86rem; color: #555; line-height: 1.35; }
	.field-desc.warning { color: #7a3a00; }
	.check { display: flex; gap: 8px; align-items: center; margin: 8px 0; }
	.actions { display: flex; gap: 8px; flex-wrap: wrap; }
	.ok { color: #0a7; }
	.bad { color: #a00; }
</style>
