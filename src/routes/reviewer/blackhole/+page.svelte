<script lang="ts">
  export let data: any;
  const submissions = data.submissions ?? [];
</script>

<main class="page">
  <a class="back" href="/reviewer">&lt; back</a>
  <h1>blackhole queue</h1>

  {#if submissions.length === 0}
    <p class="muted">no pending blackhole submissions!</p>
  {:else}
    <div class="list">
      {#each submissions as s}
        <a class="card" href={`/reviewer/blackhole/${s.id}`}>
          <div class="title">{s.Username || 'unknown'}</div>
          <div class="muted">project: {s.Project || '-'}</div>
          <div class="muted">status: {s.status}</div>
        </a>
      {/each}
    </div>
  {/if}
</main>

<style>
  .page {
    min-height: 100vh;
    background: #000;
    color: #fff;
    padding: 24px;
    font-family: system-ui;
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

  .list {
    display: felx;
    flex-direction: column;
    gap: 10px;
    margin-top: 16px;
    max-width: 720px;
  }

  .card { 
    border:1px solid rgba(255, 255, 255, 0.16);
    border-radius: 12px;
    padding: 12px 14px;
    color: #fff;
    text-decoration: none;
  }

  .card:hover {
    border-color: rgba(255, 255, 255, 0.4);
  }

  .title {
    font-weight: 700;
  }
</style>
