<script lang="ts">
  export let data: any;
  const p = data.project;

  let msg = '';
  let err = '';

  async function act(action: 'award10' | 'award9' | 'backToWip') {
    msg = '';
    err = '';
    try {
      const res = await fetch('/reviewer/second/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: p.id, action })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'failed');

      if (json.awardResult) {
        msg = `Awarded ${json.awardResult.coinsAwarded} coins (${json.awardResult.coinsPerHour} coins/hr).`;
      } else {
        msg = `Updated status to ${json.newStatus}.`;
      }

      setTimeout(() => (window.location.href = '/reviewer/second'), 400);
    } catch (e: any) {
      err = e.message ?? String(e);
    }
  }
</script>

<main class="page">
  <a class="back" href="/reviewer/second">&lt; back</a>
  <h1>second review</h1>

  <h2>{p.projectname}</h2>
  <p class="muted">user: {p.username || '-'}</p>

  <div class="links">
    {#if p.shipURL}<a href={p.shipURL} target="_blank" rel="noreferrer">&gt; shipURL</a>{/if}
    {#if p.githubURL}<a href={p.githubURL} target="_blank" rel="noreferrer">&gt; githubURL</a>{/if}
  </div>

  <div class="box">
    <p><strong>description</strong></p>
    <pre>{p.description || '-'}</pre>
    <p class="muted">
      hoursShipped: {p.hoursShipped ?? '—'} • votes: CG {p.Crazygood} / G {p.good} / U {p.unsure} / NH {p.nothours}
    </p>
  </div>

  <div class="actions">
    <button on:click={() => act('award10')}>Award 10 coins/hr</button>
    <button on:click={() => act('award9')}>Award 9 coins/hr</button>
    <button on:click={() => act('backToWip')}>Send back to WIP</button>
  </div>

  {#if msg}<p style="color:#6ee7b7">{msg}</p>{/if}
  {#if err}<p style="color:#fca5a5">{err}</p>{/if}
</main>

<style>
  .page { min-height: 100vh; background:#000; color:#fff; padding:24px; font-family:system-ui; max-width:1000px; margin:0 auto; }
  .back { color:#fff; text-decoration:none; opacity:.85; }
  .back:hover { text-decoration:underline; }
  .muted { opacity:.75; }
  .links { display:flex; gap:12px; margin:10px 0 18px; }
  .links a { color:#fff; text-decoration:none; }
  .links a:hover { text-decoration:underline; }
  .box { border:1px solid rgba(255,255,255,.16); border-radius:12px; padding:12px; background: rgba(0,0,0,.6); }
  pre { white-space:pre-wrap; word-break:break-word; margin:0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size:.85rem; opacity:.95; }
  .actions { display:grid; gap:8px; margin-top:12px; max-width:720px; }
  button { border:1px solid rgba(255,255,255,.16); border-radius:12px; padding:10px 12px; background: rgba(0,0,0,.6); color:#fff; text-align:left; cursor:pointer; }
  button:hover { border-color: rgba(255,255,255,.4); }
</style>
