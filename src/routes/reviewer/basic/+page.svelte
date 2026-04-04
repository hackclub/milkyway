<script lang="ts">
  export let data: any;
  const projects = data.projects ?? [];
</script>

<main class="page">
  <a class="back" href="/reviewer">&lt; back</a>
  <h1>basic review queue</h1>

  {#if projects.length === 0}
    <p class="muted">no projects to review lets GOOOOO</p>
  {:else}
    <div class="list">
      {#each projects as p}
        <a class="card" href={`/reviewer/basic/${p.id}`}>
          <div class="title">{p.projectname}</div>
          <div class="muted">user: {p.username || '-'}</div>
          <div class="muted">ship: {p.shipURL ? 'yes' : 'no'} · github: {p.githubURL ? 'yes' : 'no'}</div>
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
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 16px;
    max-width: 720px;
  }
  .card {
    border: 1px solid rgba(255, 255, 255, 0.16);
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
