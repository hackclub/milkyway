<script lang="ts">
  export let data: any = {};

  const homeHref = '/home';

  let user = data.user ?? {};
  let coins: number = data.coins ?? 0;
  let stellarships: number = data.stellarships ?? 0;
  let projects = Array.isArray(data.projects) ? data.projects : [];
  let submissions = Array.isArray(data.submissions) ? data.submissions : [];
  let showIntro = true;

  let selectedProjectId: string = projects[0]?.id ?? '';
  let justification = '';

  let loading = false;
  let message = '';

  function getEggSrc(egg: string | undefined) {
    if (!egg) return '/projects/sparkle_egg1.png'; // not sure what base img for project is..
    return egg.startsWith('/') ? egg : `/${egg}`;
  }

  async function submit() {
    if (!selectedProjectId) {
      message = 'pick a creature / project first.';
      return;
    }

    loading = true;
    message = '';

    try {
      const res = await fetch('/api/blackhole/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user?.username,
          projectId: selectedProjectId
          // NEED TO ADD JUSTIFICATION
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'failed to submit');
      }

      const submission = await res.json();

      message = `submitted! status: ${submission.status}`;
      submissions = [submission, ...submissions];
      coins = coins - 10;
      justification = '';
    } catch (err) {
      const e = err as Error;
      message = e.message ?? 'error submitting';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Black Hole</title>
</svelte:head>

<div class="blackhole-page">
  {#if !showIntro}
    <div class="bg-layer"></div>
  {/if}

  <main class="content {showIntro ? 'fade-in-slow' : 'fade-in'}">
    {#if showIntro}
      <section class="intro">
        <h1 class="title">stellarships</h1>

        <p>
          if your creature makes it out — congrats, you've got a stellar ship!<br />
          if it doesn’t — it will walk shamefully back home. (don’t worry, it won’t die.)
        </p>

        <p class="spacer"></p>

        <p>some examples of what the black hole looks for:</p>
        <ul>
          <li>at least 25 hours spent on your project</li>
          <li>a fully functional game with an engaging game loop</li>
          <li>unique art styles, assets, gameplay features that make it an interesting game</li>
          <li>a good storefront — steam or itch.io page</li>
          <li>most importantly, if you get a lot of people playing it!!!</li>
        </ul>

        <div class="intro-options">
          <button type="button" on:click={() => (showIntro = false)}>
            &gt; select a creature
          </button>
          <a href={homeHref}>
            &gt; or: return home.
          </a>
        </div>

        <p class="status-line">
          coins: {coins} · stellarships: {stellarships}
        </p>
      </section>
    {:else}
      <section class="choose">
        <h1>choose your project</h1>

        {#if !projects || projects.length === 0}
          <p>you don't have any creatures yet.</p>
        {:else}
          <div class="project-row">
            {#each projects as p}
              {#if p}
                <button
                  type="button"
                  class={"project-card" + (selectedProjectId === p.id ? " selected" : "")}
                  on:click={() => (selectedProjectId = p.id)}
                >
                  <img src={getEggSrc(p.egg)} alt={p.name ?? 'project'} />
                  <div class="project-name">
                    &gt; {p.name ?? 'unnamed project'}
                  </div>
                </button>
              {/if}
            {/each}
          </div>

          <div class="explanation-box">
            <textarea
              bind:value={justification}
              placeholder="explain why your creature will survive the black hole
(eg. explain what’s so awesome about your project/the reception!)"
            ></textarea>
          </div>

          <div class="submit-options">
            <button type="button" on:click={submit} disabled={loading}>
              {#if loading}
                &gt; submitting creature into the black hole...
              {:else}
                &gt; submit a creature into the black hole (10 coins)
              {/if}
            </button>

            <a href={homeHref}>
              &gt; or: return home.
            </a>
          </div>

          {#if message}
            <p class="message">{message}</p>
          {/if}

          <p class="coins-info">
            coins: {coins} · stellarships: {stellarships}
          </p>
        {/if}
      </section>
    {/if}
  </main>
</div>

<style>
  .blackhole-page {
    position: relative;
    min-height: 100vh;
    width: 100%;
    background: #000;
    color: #f5f5f5;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem 1rem;
    box-sizing: border-box;
    overflow: hidden;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .bg-layer {
    position: fixed;
    inset: 0;
    background-image: url('/blackholebackground.jpg');
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
    opacity: 0;
    animation: bgFadeIn 2s ease-out forwards;
    z-index: 0;
  }

  @keyframes bgFadeIn {
    from {
      opacity: 0;
      filter: brightness(0.2);
    }
    to {
      opacity: 1;
      filter: brightness(1);
    }
  }

  .content {
    position: relative;
    max-width: 900px;
    width: 100%;
    z-index: 1;
    text-align: center;
  }

  .fade-in-slow {
    opacity: 0;
    animation: textFadeIn 3.2s ease-out forwards;
  }

  .fade-in {
    opacity: 0;
    animation: textFadeIn 1.6s ease-out forwards;
  }

  @keyframes textFadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .title {
    font-size: 2.4rem;
    font-weight: 700;
    margin-bottom: 1.2rem;
    text-transform: lowercase;
  }

  .intro {
    font-size: 1rem;
    line-height: 1.6;
  }

  .intro ul {
    list-style: none;
    padding: 0;
    margin: 1rem 0 1.5rem;
  }

  .intro li::before {
    content: '• ';
  }

  .intro-options {
    margin-top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    align-items: center;
  }

  .intro-options button,
  .intro-options a,
  .submit-options button,
  .submit-options a {
    background: none;
    border: none;
    color: #f5f5f5;
    font-size: 1rem;
    cursor: pointer;
    text-decoration: none;
  }

  .intro-options button:hover,
  .intro-options a:hover,
  .submit-options button:hover,
  .submit-options a:hover {
    text-decoration: underline;
  }

  .spacer {
    height: 0.5rem;
  }

  .status-line {
    margin-top: 1.5rem;
    font-size: 0.9rem;
    opacity: 0.9;
  }

  .choose h1 {
    font-size: 1.6rem;
    margin-bottom: 2rem;
  }

  .project-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    justify-content: center;
    margin-bottom: 1.5rem;
  }

  .project-card {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: center;
    color: inherit;
    transition: transform 0.12s ease, filter 0.12s ease;
  }

  .project-card img {
    display: block;
    width: 140px;
    height: auto;
  }

  .project-card .project-name {
    margin-top: 0.5rem;
    font-size: 0.95rem;
  }

  .project-card.selected {
    transform: translateY(-4px);
    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.7));
  }

  .explanation-box {
    max-width: 640px;
    margin: 0 auto 1rem;
    padding: 0.75rem;
    border-radius: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.4);   /* lighter border */
    background: rgba(0, 0, 0, 0.3);               /* lighter box */
  }

  .explanation-box textarea {
    width: 100%;
    min-height: 90px;
    border: none;
    outline: none;
    resize: vertical;
    background: transparent;
    color: #f5f5f5;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .submit-options {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    align-items: center;
  }

  .submit-options button:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .message {
    margin-top: 0.75rem;
    font-size: 0.9rem;
  }

  .coins-info {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    opacity: 0.9;
  }

  @media (max-width: 640px) {
    .project-card img {
      width: 110px;
    }
  }
</style>



<!-- OLDER SCRIPT -->

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
