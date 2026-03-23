<script lang="ts">
	let projects = $state<any[]>([]);
	let loading = $state(true);
	let error = $state('');
	let submittingById = $state<Record<string, boolean>>({});
	let stats = $state({
		projectsLeft: 0,
		projectsWithOneReviewer: 0,
		projectsWithTwoReviewers: 0
	});

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

	loadNext();
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
	.mini { padding: 8px; border: 1px solid #eee; border-radius: 6px; margin: 8px 0; }
	textarea, input[type='number'] { width: 100%; box-sizing: border-box; margin-top: 6px; margin-bottom: 10px; }
	.actions { display: flex; gap: 8px; flex-wrap: wrap; }
	.check { display: flex; gap: 8px; align-items: center; margin: 8px 0; }
	.ok { color: #0a7; }
	.bad { color: #a00; }
	.hackatime-names { margin-top: 8px; font-size: 0.9rem; }
	.hackatime-names ul { margin: 6px 0 0 1.2rem; padding: 0; }
	.muted { color: #777; font-style: italic; }
</style>
