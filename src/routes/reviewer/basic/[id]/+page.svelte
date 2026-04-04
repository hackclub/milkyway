<script lang="ts">
  export let data: any;
  const p = data.project;

  let message = '';
  let errorMsg = '';

  async function submitVote(vote: 'crazygood' | 'good' | 'unsure' | 'nothours') {
    message = '';
    errorMsg = '';

    try {
      const res = await fetch('/reviewer/basic/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: p.id, vote })
      });

      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Vote failed');

      if (j.awardResult) {
        message = `Saved. Awarded ${j.awardResult.coinsAwarded} coins (${j.awardResult.coinsPerHour} coins/hr).`;
      } else {
        message = `Saved. Project status: ${j.newStatus}.`;
      }

      // back to queue
      location.href = '/reviewer/basic';
    } catch (e: any) {
      errorMsg = e?.message ?? String(e);
    }
  }
</script>

<main class="page">
  <a class="back" href="/reviewer/basic">&lt; back to queue</a>
  <h1>{p.projectname}</h1>

  <p class="muted">username: <strong>{p.username || '-'}</strong></p>

  <div class="links">
    {#if p.shipURL}<a href={p.shipURL} target="_blank" rel="noreferrer">&gt; shipURL</a>{/if}
    {#if p.githubURL}<a href={p.githubURL} target="_blank" rel="noreferrer">&gt; githubURL</a>{/if}
  </div>

  {#if message}<p class="ok">{message}</p>{/if}
  {#if errorMsg}<p class="err">{errorMsg}</p>{/if}

  <section class="grid">
    <div class="box">
      <h2>howToPlay</h2>
      <pre>{p.howToPlay || '-'}</pre>
    </div>

    <div class="box">
      <h2>addnComments</h2>
      <pre>{p.addnComments || '-'}</pre>
    </div>

    <div class="box">
      <h2>notMadeBy</h2>
      <pre>{p.notMadeBy || '-'}</pre>
    </div>

    <div class="box">
      <h2>description</h2>
      <pre>{p.description || '-'}</pre>
    </div>

    <div class="box">
      <h2>hours</h2>
      <pre>hoursShipped: {p.hoursShipped ?? '—'}
artHoursShipped: {p.artHoursShipped ?? '—'}</pre>
    </div>

    <div class="box">
      <h2>hackatimeProjects</h2>
      <pre>{JSON.stringify(p.hackatimeProjects ?? [], null, 2)}</pre>
    </div>
  </section>

  <p class="muted" style="margin-top: 12px;">
    current votes — Crazygood: {p.Crazygood ?? 0}, good: {p.good ?? 0}, unsure: {p.unsure ?? 0}, nothours: {p.nothours ?? 0}
  </p>

  <div class="vote-buttons">
    <button on:click={() => submitVote('crazygood')}>this is a crazy good project, i really liked it!</button>
    <button on:click={() => submitVote('good')}>this is a good project that seems to have spent the number of hours stated</button>
    <button on:click={() => submitVote('unsure')}>i'm not too sure</button>
    <button on:click={() => submitVote('nothours')}>this does not feel like they spent the number of hours stated</button>
  </div>
</main>

<style>
  .page {
    min-height: 100vh;
    background: #000;
    color: #fff;
    padding: 24px;
    font-family: system-ui;
    max-width: 1000px;
    margin: 0 auto;
  }
  .back {
    color: #fff;
    text-decoration: none;
    opacity: 0.85;
  }
  .back:hover {
    text-decoration: underline;
  }
  .muted {
    opacity: 0.75;
  }
  .ok { margin-top: 10px; color: #b7ffb7; }
  .err { margin-top: 10px; color: #ffb7b7; }

  .links {
    display: flex;
    gap: 12px;
    margin: 10px 0 18px;
  }
  .links a {
    color: #fff;
    text-decoration: none;
  }
  .links a:hover {
    text-decoration: underline;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .box {
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 12px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.6);
  }
  h2 {
    font-size: 0.95rem;
    margin: 0 0 8px;
    text-transform: lowercase;
  }
  pre {
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    opacity: 0.95;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.85rem;
  }

  .vote-buttons {
    display: grid;
    gap: 8px;
    margin-top: 10px;
    max-width: 720px;
  }
  .vote-buttons button {
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 12px;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    text-align: left;
    cursor: pointer;
  }
  .vote-buttons button:hover {
    border-color: rgba(255, 255, 255, 0.4);
  }

  @media (max-width: 900px) {
    .grid { grid-template-columns: 1fr; }
  }
</style>
