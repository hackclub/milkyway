<script lang="ts">
  export let data: any;

  const user = data.user ?? {};
  const submissions = Array.isArray(data.submissions) ? data.submissions : [];

  const homeHref = '/home';

  function formatStatus(status: string | null | undefined) {
    if (!status) return 'pending';
    return status.toLowerCase();
  }
</script>

<svelte:head>
  <title>Black Hole Submissions</title>
</svelte:head>

<main class="page">
  <h1>your black hole submissions</h1>

  <p class="who">
    logged in as <strong>{user.username ?? 'unknown'}</strong>
  </p>

  <a class="back-link" href="/blackhole">&gt; back to black hole</a>

  {#if !submissions || submissions.length === 0}
    <p class="empty">you haven’t submitted any creatures yet.</p>
  {:else}
    <section class="list">
      {#each submissions as s}
        <article class="item">
          <div class="row">
            <span class="label">project</span>
            <span class="value">{s.projectId}</span>
          </div>
          <div class="row">
            <span class="label">status</span>
            <span class={"value status " + formatStatus(s.status)}>
              {formatStatus(s.status)}
            </span>
          </div>
          <div class="row">
            <span class="label">coins spent</span>
            <span class="value">{s.coinsSpent ?? 0}</span>
          </div>
          {#if s.hackatimeHours != null}
            <div class="row">
              <span class="label">hours at submission</span>
              <span class="value">{s.hackatimeHours}</span>
            </div>
          {/if}
          {#if s.reason}
            <div class="row">
              <span class="label">review notes</span>
              <span class="value">{s.reason}</span>
            </div>
          {/if}
          {#if s.justification}
            <div class="row">
              <span class="label">justification</span>
              <span class="value">{s.justification}</span>
            </div>
          {/if}
        </article>
      {/each}
    </section>
  {/if}
</main>

<style>
  .page {
    min-height: 100vh;
    padding: 2rem 1rem;
    max-width: 800px;
    margin: 0 auto;
    color: #f5f5f5;
    background: #000;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
      sans-serif;
  }

  h1 {
    font-size: 1.8rem;
    margin-bottom: 0.75rem;
    text-transform: lowercase;
  }

  .who {
    font-size: 0.95rem;
    margin-bottom: 0.75rem;
    opacity: 0.9;
  }

  .back-link {
    display: inline-block;
    font-size: 0.95rem;
    margin-bottom: 1.5rem;
    text-decoration: none;
    color: #f5f5f5;
  }

  .back-link:hover {
    text-decoration: underline;
  }

  .empty {
    margin-top: 1rem;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .item {
    border-radius: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.16);
    padding: 0.75rem 1rem;
    background: rgba(0, 0, 0, 0.7);
  }

  .row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    font-size: 0.9rem;
    margin: 0.1rem 0;
  }

  .label {
    opacity: 0.7;
  }

  .value {
    font-weight: 500;
  }

  .status.approved {
    color: #8cff8c;
  }

  .status.rejected {
    color: #ff8c8c;
  }

  .status.pending {
    color: #ffe28c;
  }
</style>
