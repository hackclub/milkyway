<script lang="ts">
  export let data: any;
  const projects = data.projects ?? [];
</script>

<main class="page">
  <a class="back" href="/reviewer">&lt; back</a>
  <h1>second review queue</h1>

  {#if projects.length === 0}
    <p class="muted">no second-review projects right now</p>
  {:else}
    <div class="list">
      {#each projects as p}
        <a class="card" href={`/reviewer/second/${p.id}`}>
          <div class="title">{p.projectname}</div>
          <div class="muted">user: {p.username || '-'}</div>
          <div class="muted">
            votes: CG {p.Crazygood} / G {p.good} / U {p.unsure} / NH {p.nothours}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</main>

<style>
  .page { min-height: 100vh; background:#000; color:#fff; padding:24px; font-family:system-ui; }
  .back { color:#fff; text-decoration:none; opacity:.85; }
  .back:hover { text-decoration:underline; }
  .muted { opacity:.75; }
  .list { display:flex; flex-direction:column; gap:10px; margin-top:16px; max-width:720px; }
  .card { border:1px solid rgba(255,255,255,.16); border-radius:12px; padding:12px 14px; color:#fff; text-decoration:none; }
  .card:hover { border-color: rgba(255,255,255,.4); }
  .title { font-weight:700; }
</style>
