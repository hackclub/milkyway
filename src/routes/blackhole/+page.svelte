<script lang="ts">
  export let data: any;

  let user = data.user ?? {};
  let coins: number = data.coins ?? 0;
  let stellarships: number = data.stellarships ?? 0;
  let projects = data.projects ?? [];
  let submissions = data.submissions ?? [];

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

<div class="blackhole-page">
  <div class="overlay"></div>

  <main class="content fade-in">
    <h1>Black Hole</h1>

    <p class="user-info">
      Logged in as
      <strong>{user.username ?? 'Unknown user'}</strong><br />
      Coins: <strong>{coins}</strong>
      · Stellarships: <strong>{stellarships}</strong>
    </p>

    <section class="panel">
      <h2>Submit a project</h2>

      {#if projects.length === 0}
        <p>You don't have any projects yet.</p>
      {:else}
        <form on:submit|preventDefault={submit} class="form">
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
        <p class="message">{message}</p>
      {/if}
    </section>

    <section class="panel">
      <h2>My submissions</h2>

      {#if !submissions || submissions.length === 0}
        <p>No submissions yet.</p>
      {:else}
        <ul class="submissions">
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
    </section>
  </main>
</div>

<style>
  .blackhole-page {
    position: relative;
    min-height: 100vh;
    width: 100%;
    background: #000;
    background-image: url('/blackholebackground.jpg');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    color: #f5f5f5;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem 1rem;
    box-sizing: border-box;
    overflow: hidden;
  }

  .overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, rgba(0, 0, 0, 0.4), #000 70%);
    pointer-events: none;
  }

  .content {
    position: relative;
    max-width: 800px;
    width: 100%;
    z-index: 1;
  }

  .fade-in {
    opacity: 0;
    animation: fadeIn 1.8s ease-out forwards;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  h1 {
    font-size: 2.4rem;
    margin-bottom: 0.5rem;
  }

  h2 {
    font-size: 1.4rem;
    margin-bottom: 0.5rem;
  }

  .user-info {
    margin-bottom: 1.5rem;
    font-size: 0.95rem;
    opacity: 0.9;
  }

  .panel {
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.75rem;
    padding: 1rem 1.2rem;
    margin-bottom: 1rem;
    backdrop-filter: blur(4px);
  }

  .form {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }

  label {
    display: flex;
    flex-direction: column;
    font-size: 0.9rem;
    gap: 0.25rem;
  }

  select,
  button {
    padding: 0.45rem 0.6rem;
    border-radius: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(10, 10, 10, 0.8);
    color: #f5f5f5;
    font-size: 0.9rem;
  }

  select {
    min-width: 220px;
  }

  button {
    cursor: pointer;
    transition: background 0.15s ease, transform 0.1s ease;
  }

  button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  button:not(:disabled):hover {
    background: rgba(40, 40, 40, 0.95);
    transform: translateY(-1px);
  }

  .message {
    margin-top: 0.75rem;
    font-size: 0.9rem;
  }

  .submissions {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 0.9rem;
  }

  .submissions li {
    padding: 0.35rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .submissions li:last-child {
    border-bottom: none;
  }

  @media (max-width: 600px) {
    .content {
      max-width: 100%;
    }

    .panel {
      padding: 0.9rem;
    }

    h1 {
      font-size: 2rem;
    }
  }
</style>


<!-- whats on the list tho -->

<!-- OLD SCRIPT -->


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
