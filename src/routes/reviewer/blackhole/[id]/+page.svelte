<script lang="ts">
  export let data: any;
  const s = data.submission;
  const project = data.project;

  let msg = '';
  let err = '';

  async function decide(decision: 'approve' | 'reject') {
    msg = '';
    err = '';
    try {
      const res = await fetch('/reviewer/blackhole/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: s.id, decision })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'failed');

      msg = `Saved: ${json.status}`;
      setTimeout(() => (window.location.href = '/reviewer/blackhole'), 350);
    } catch (e: any) {
      err = e.message ?? String(e);
    }
  }
</script>

<main class="page">
  <a class="back" href="/reviewer/blackhole">&lt; back to queue</a>
  <h1>blackhole review</h1>

  <div class="box">
    <div><strong>User</strong>: {s.User || '—'}</div>
    <div><strong>Username</strong>: {s.Username || '—'}</div>
    <div><strong>Project</strong>: {s.Project || '—'}</div>
    <div><strong>shipURL</strong>: {s.shipURL || project?.shipURL || '—'}</div>
  </div>

  <div class="box">
    <h2>Justification</h2>
    <p class="text">{s.Justification || '(none)'}</p>
  </div>

  <div class="box">
    <h2>Screenshots</h2>
    {#if attachmentUrls(s.Screenshots).length === 0}
      <p class="muted">(none)</p>
    {:else}
      <div class="shots">
        {#each attachmentUrls(s.Screenshots) as url}
          <img src={url} alt="screenshot" />
        {/each}
      </div>
    {/if}
  </div>

  {#if project}
    <a class="btn" href={`/reviewer/basic/${project.id}`}>
      &gt; open linked project (projects tab view later)
    </a>
  {/if}

  <div class="actions">
    <button type="button">approve</button>
    <button type="button">reject</button>
  </div>
</main>

<style>
  .page { 
    min-height:100vh; 
    background:#000; 
    color:#fff;
    padding:24px;
    font-family:system-ui;
    max-width:1000px;
    margin:0 auto;
  }
  .back {
    color:#fff;
    text-decoration:none;
    opacity:0.85;
  }
  .back:hover {
    text-decoration:underline;
  }
  .box {
    border:1px solid rgba(255,255,255,0.16);
    border-radius:12px;
    padding:12px 14px;
    margin:12px 0;
    background: rgba(0,0,0,0.6);
  }
  .muted {
    opacity:0.75;
  }
  h2 {
    margin:0 0 8px; font-size: 1rem; text-transform: lowercase;
  }
  .text {
    opacity:0.95;
  }
  .shots {
    display:flex;
    flex-wrap:wrap;
    gap:10px;
  }
  .shots img {
    max-width: 280px;
    border-radius:10px;
    border:1px solid rgba(255,255,255,0.15);
  }
  .btn {
    display:inline-block;
    margin:10px 0;
    color:#fff;
    text-decoration:none;
    border:1px solid rgba(255,255,255,0.16);
    padding:10px 12px;
    border-radius:12px;
  }
  .btn:hover {
    border-color: rgba(255,255,255,0.4); }
  .actions {
    display:flex;
    gap:10px;
    margin-top: 14px;
  }
  button {
    padding:10px 14px;
    border-radius:12px;
    border:1px solid rgba(255,255,255,0.2);
    background:#111;
    color:#fff;
    cursor:pointer;
    }
</style>
