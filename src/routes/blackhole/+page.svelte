<script lang="ts">
  export let data: any = {};

  const homeHref = '/home';

  let user = data.user ?? {};
  let coins: number = data.coins ?? 0;
  let stellarships: number = data.stellarships ?? 0;
  let projects = Array.isArray(data.projects) ? data.projects : [];
  let submissions = Array.isArray(data.submissions) ? data.submissions : [];
  // step 0: "what's a stellar ship?" | step 1: criteria intro | step 2: choose project | step 3: success
  let step = 0;
  let submittedProjectName = '';

  // Only show projects that have been shipped (have a shipURL)
  $: shippedProjects = projects.filter((p: any) => p.shipURL && p.shipURL.trim() !== '');

  // Get project IDs that have NOT been submitted yet
  $: availableProjects = shippedProjects.filter((p: any) => 
    !submissions.some((s: any) => s.projectId === p.id)
  );

  let selectedProjectId: string = '';
  
  // Initialize selectedProjectId - prefer non-submitted projects first
  $: if (!selectedProjectId || !shippedProjects.some((p: any) => p.id === selectedProjectId)) {
    if (availableProjects.length > 0) {
      selectedProjectId = availableProjects[0]?.id ?? '';
    } else if (shippedProjects.length > 0) {
      selectedProjectId = shippedProjects[0]?.id ?? '';
    }
  }
  let justification = '';
  let uploadedImages: { data: string; name: string }[] = [];
  let fileInput: HTMLInputElement;

  let loading = false;
  let message = '';

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files) return;

    // Limit to 5 images total
    const remaining = 5 - uploadedImages.length;
    const filesToProcess = Array.from(files).slice(0, remaining);

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 5 * 1024 * 1024) {
        message = 'Image too large (max 5MB each)';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        uploadedImages = [...uploadedImages, { data: result, name: file.name }];
      };
      reader.readAsDataURL(file);
    });

    // Reset file input
    input.value = '';
  }

  function removeImage(index: number) {
    uploadedImages = uploadedImages.filter((_, i) => i !== index);
  }

  // Filter pending submissions
  $: pendingSubmissions = submissions.filter((s: any) => s.status === 'pending');

  // Get ALL project IDs that have been submitted to the blackhole (any status)
  $: submittedProjectIds = new Set(submissions.map((s: any) => s.projectId));

  // Check if selected project has already been submitted
  $: isSelectedProjectSubmitted = submittedProjectIds.has(selectedProjectId);

  // Check if selected project is currently pending
  $: isSelectedProjectPending = pendingSubmissions.some((s: any) => s.projectId === selectedProjectId);

  // Get selected project name
  $: selectedProjectName = projects.find((p: any) => p.id === selectedProjectId)?.name ?? 'a creature';

  // Get project info by projectId
  function getProjectForSubmission(submission: any) {
    return projects.find((p: any) => p.id === submission.projectId);
  }

  function getEggSrc(egg: string | undefined) {
    if (!egg) return '/projects/sparkle_egg1.png'; // not sure what base img for project is..
    return egg.startsWith('/') ? egg : `/${egg}`;
  }

  async function submit() {
    if (!selectedProjectId) {
      message = 'pick a creature / project first.';
      return;
    }

    if (isSelectedProjectSubmitted) {
      message = 'this project has already been submitted to the black hole.';
      return;
    }

    if (coins < 10) {
      message = 'not enough coins (requires 10 coins).';
      return;
    }

    if (!justification.trim()) {
      message = 'please explain why your project deserves a stellar ship.';
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
          projectId: selectedProjectId,
          justification: justification.trim() || undefined
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'failed to submit');
      }

      const submission = await res.json();

      // Upload images if any
      if (uploadedImages.length > 0 && submission.id) {
        for (const img of uploadedImages) {
          try {
            await fetch('/api/blackhole/upload-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                submissionId: submission.id,
                imageData: img.data,
                filename: img.name
              })
            });
          } catch (imgErr) {
            console.error('Failed to upload image:', imgErr);
          }
        }
      }

      // Store the name for the success screen
      submittedProjectName = selectedProjectName;
      
      submissions = [submission, ...submissions];
      coins = coins - 10;
      justification = '';
      uploadedImages = [];
      message = '';
      
      // Go to success screen
      step = 3;
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
  {#if step >= 2}
    <div class="bg-layer"></div>
  {/if}

  {#key step}
    <main class="content {step < 2 ? 'fade-in-slow' : 'fade-in'}">
      {#if step === 0}
      <section class="intro poem-intro">
        <h1 class="title">what's a stellar ship?</h1>

        <p class="poem">
          a brightly shining star —<br />
          a ship that sails.<br />
          a ship that flies.<br />
          a ship that soars far in the sky.
        </p>

        <p class="poem-question">does your ship have what it takes?</p>

        <div class="intro-options">
          <button type="button" on:click={() => (step = 1)}>
            &gt; peer into the black hole
          </button>
          <a href={homeHref}>
            &gt; or: return home.
          </a>
        </div>

        {#if pendingSubmissions.length > 0}
          <div class="pending-section">
            <p class="pending-label">currently in the black hole:</p>
            <div class="pending-row">
              {#each pendingSubmissions as sub}
                {@const proj = getProjectForSubmission(sub)}
                <div class="pending-card">
                  <img src={getEggSrc(proj?.egg)} alt={proj?.name ?? 'project'} />
                  <div class="pending-name">{proj?.name ?? 'unknown'}</div>
                  <div class="pending-status">pending</div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </section>
    {:else if step === 1}
      <section class="intro">

        <p>
          if your creature makes it out — congrats, you've got a stellar ship!<br />
          if it doesn't — it will walk shamefully back home. (don't worry, it won't die.)
        </p>

        <p class="spacer"></p>

        <p>the black hole rewards effort and innovation.<br/>
        some examples of what it wants:</p>
        <ul>
          <li>high-quality hours spent on your project</li>
          <li>a fully functional game with an engaging game loop</li>
          <li>unique art styles, assets, gameplay features that make it an interesting game</li>
          <li>a good storefront — steam or itch.io page</li>
          <li>proof that people like your game: play/download counts, popular posts on social media, etc!</li>
        </ul>
        <p>you do not need all of them to have a stellarship, but the more the better.</p>

        <div class="intro-options">
          <button type="button" on:click={() => (step = 2)}>
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
    {:else if step === 2}
      <section class="choose">
        <h1>choose your project</h1>

        {#if !shippedProjects || shippedProjects.length === 0}
          <p class="no-projects-msg">ship a project first.</p>
          <div class="back-option">
            <a href={homeHref}>&gt; return home</a>
          </div>
        {:else}
          <div class="project-row">
            {#each shippedProjects as p}
              {#if p}
                {@const submission = submissions.find((s: any) => s.projectId === p.id)}
                {@const isSubmitted = !!submission}
                <button
                  type="button"
                  class="project-card{selectedProjectId === p.id ? ' selected' : ''}{isSubmitted ? ' submitted' : ''}"
                  on:click={() => (selectedProjectId = p.id)}
                >
                  <img src={getEggSrc(p.egg)} alt={p.name ?? 'project'} />
                  <div class="project-name">
                    &gt; {p.name ?? 'unnamed project'}
                  </div>
                  {#if isSubmitted}
                    <div class="status-badge {submission.status}">{submission.status}</div>
                  {/if}
                </button>
              {/if}
            {/each}
          </div>

          <div class="explanation-box">
            <textarea
              bind:value={justification}
              placeholder="explain how your creature will survive the black hole
(eg. what's special about your project? how many people play it? what's the reception like?)"
            ></textarea>
          </div>

          <div class="upload-section">
            <p class="upload-label">add screenshots as proof (optional, up to 5 - such as screenshots of itch.io play count)</p>
            
            <input
              type="file"
              accept="image/*"
              multiple
              bind:this={fileInput}
              on:change={handleFileSelect}
              style="display: none;"
            />
            
            {#if uploadedImages.length > 0}
              <div class="image-previews">
                {#each uploadedImages as img, i}
                  <div class="preview-item">
                    <img src={img.data} alt="preview" />
                    <button type="button" class="remove-btn" on:click={() => removeImage(i)}>×</button>
                  </div>
                {/each}
              </div>
            {/if}

            {#if uploadedImages.length < 5}
              <button type="button" class="add-image-btn" on:click={() => fileInput.click()}>
                + add {uploadedImages.length > 0 ? 'more ' : ''}screenshots
              </button>
            {/if}
          </div>

          <div class="submit-options">
            <button type="button" on:click={submit} disabled={loading || isSelectedProjectSubmitted || coins < 10}>
              {#if loading}
                &gt; submitting {selectedProjectName} into the black hole...
              {:else if isSelectedProjectSubmitted}
                &gt; {selectedProjectName} has already been submitted
              {:else if coins < 10}
                &gt; not enough coins (need 10, have {coins})
              {:else}
                &gt; submit {selectedProjectName} into the black hole (10 coins)
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
    {:else if step === 3}
      <section class="intro success-screen">
        <p class="success-message">
          {submittedProjectName} went into the black hole.
        </p>

        <p class="success-message">
          you will hear back from it in a few working days.
        </p>

        <div class="intro-options">
          <a href={homeHref}>
            &gt; go home and wait.
          </a>
        </div>
      </section>
    {/if}
    </main>
  {/key}
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
      opacity: 0.5;
      filter: brightness(0.6);
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

  .poem-intro .poem {
    font-style: italic;
    margin: 1.5rem 0;
    line-height: 2;
  }

  .poem-intro .poem-question {
    margin-top: 2rem;
    margin-bottom: 1.5rem;
  }

  .success-screen .success-message {
    font-size: 1.1rem;
    margin-bottom: 1.5rem;
    line-height: 1.8;
  }

  .pending-section {
    margin-top: 2.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
  }

  .pending-label {
    font-size: 0.9rem;
    opacity: 0.7;
    margin-bottom: 1rem;
  }

  .pending-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    justify-content: center;
  }

  .pending-card {
    text-align: center;
  }

  .pending-card img {
    width: 80px;
    height: auto;
    opacity: 0.8;
  }

  .pending-name {
    margin-top: 0.4rem;
    font-size: 0.85rem;
  }

  .pending-status {
    font-size: 0.75rem;
    opacity: 0.6;
    font-style: italic;
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

  .no-projects-msg {
    font-size: 1.1rem;
    opacity: 0.8;
    margin-bottom: 1.5rem;
  }

  .back-option {
    margin-top: 1rem;
  }

  .back-option a {
    color: #f5f5f5;
    text-decoration: none;
    font-size: 1rem;
  }

  .back-option a:hover {
    text-decoration: underline;
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

  .project-card.submitted {
    opacity: 0.6;
  }

  .project-card.submitted img {
    filter: grayscale(0.4);
  }

  .status-badge {
    margin-top: 0.25rem;
    font-size: 0.7rem;
    font-style: italic;
    padding: 0.15rem 0.4rem;
    border-radius: 0.25rem;
    display: inline-block;
  }

  .status-badge.pending {
    color: #fbbf24;
  }

  .status-badge.approved {
    color: #34d399;
  }

  .status-badge.rejected {
    color: #f87171;
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

  .upload-section {
    max-width: 640px;
    margin: 0 auto 1.5rem;
  }

  .upload-label {
    font-size: 0.85rem;
    opacity: 0.7;
    margin-bottom: 0.75rem;
  }

  .image-previews {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
    margin-bottom: 0.75rem;
  }

  .preview-item {
    position: relative;
    width: 80px;
    height: 80px;
  }

  .preview-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .preview-item .remove-btn {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.5);
    color: #f5f5f5;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .preview-item .remove-btn:hover {
    background: rgba(255, 50, 50, 0.8);
  }

  .add-image-btn {
    background: none;
    border: 1px dashed rgba(255, 255, 255, 0.4);
    color: #f5f5f5;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.85rem;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.15s ease;
  }

  .add-image-btn:hover {
    opacity: 1;
    border-color: rgba(255, 255, 255, 0.6);
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
