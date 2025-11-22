<script lang="ts">
  export let data: any;

  // fallbacks just in case 
  let user = data.user ?? {};
  let coins: number = data.coins ?? 0;
  let stellarships: number = data.stellarships ?? 0;
  let projects = data.projects ?? [];
  let submissions = data.submissions ?? [];

  // default project(first)
  let selectedProjectId: string = projects[0]?.id ?? '';

  let loading = false;
  let message = '';

  async function submit() {
    if (!selectedProjectId) {
      message = 'Pick a project first.';
      return;
    }

    loading = true;
    message = '';

    try {
      const res = await fetch('/api/blackhole/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          projectId: selectedProjectId
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to submit');
      }

      const submission = await res.json();

      message = `Submitted! Status: ${submission.status}`;
      submissions = [submission, ...submissions];
      coins = coins - 10;
    } catch (err) {
      const e = err as Error;
      message = e.message ?? 'Error submitting';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Black Hole</title>
</svelte:head>

<h1>Black Hole</h1>

<p>
  Logged in as
  <strong>{user.username ?? 'Unknown user'}</strong><br />
  Coins: <strong>{coins}</strong>
  · Stellarships: <strong>{stellarships}</strong>
</p>

<h2>Submit a project</h2>

{#if projects.length === 0}
  <p>You don't have any projects yet.</p>
{:else}
  <form on:submit|preventDefault={submit}>
    <label>
      Project
      <select bind:value={selectedProjectId}>
        {#each projects as p}
          <option value={p.id}>
            {p.name} ({p.hackatimeHours ?? 0}h)
          </option>
        {/each}
      </select>
    </label>

    <button type="submit" disabled={loading}>
      {#if loading}
        Submitting...
      {:else}
        Submit to Black Hole (10 coins)
      {/if}
    </button>
  </form>
{/if}

{#if message}
  <p>{message}</p>
{/if}

<h2>My submissions</h2>

{#if submissions.length === 0}
  <p>No submissions yet.</p>
{:else}
  <ul>
    {#each submissions as s}
      <li>
        <strong>{s.status}</strong>
        — project: {s.projectId}
        {#if s.createdTime}
          — at {s.createdTime}
        {/if}
      </li>
    {/each}
  </ul>
{/if}


<!-- Y'know what I should've probably kept this for the other api stuff but damn -->
<!-- <script>
  let { data } = $props();
  let coins = $state(data.coins ?? 0);
  let projects = $state(data.projects ?? []);
  let submissions = $state(data.submissions ?? []);

  async function submitToBlackhole(projectId) {
    const res = await fetch('/api/blackhole/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId })
    });
    const j = await res.json();
    if (!j.ok) alert(j.message || 'Failed');
    else {
      coins = j,coins;
      submissions = [j.submission, ...submissions];
      alert("Submitted! It's now pending review.");
    }
  }
</script>

<svelte:head><title>Black Hole ✦</title></svelte:head>

<section class="wrap">
  <h1>Enter the Black Hole</h1>
  <p>Submit a project for 10 coins. If worthy, you'll earn a <b>Stellar Ship</b> 🚀</p>
  <p>Coins: {coins}</p>

  <h2>Your Projects</h2>
  {#each projects as p}
    <div class="card">
      <div>{p.name}</div>
      <button on:click={() => submitToBlackhole(p.id)}>Submit (10 coins)</button>
    </div>
  {/each}

  <h2>My Submissions</h2>
  {$each submissions as s}
    <div class="row">
      <span>{s.id}</span>
      <span>{s.status}</span>
    </div>
  {/each}
</section>

<style>

.wrap { padding: 24px; color: #fff; }
.card { border: 1px solid #444; padding: 8px; margin: 6px 0; }
.row { display:flex; gap:12px; }

</style> -->
