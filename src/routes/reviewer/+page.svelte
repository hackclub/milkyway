<script lang="ts">
  export let data: any;
  export let form: any; 

  let user = data.user ?? {};
  let submissions = data.submissions ?? [];

  let loadingId: string | null = null;
  let message = '';
</script>

<svelte:head>
  <title>Reviewer</title>
</svelte:head>

{#if !data.authorized}
  <h1>Reviewer Login</h1>
  <p>Enter da password please</p>

  {#if form?.error}
    <p style="color: red;">{form.error}</p>
  {/if}

  <form method="POST">
    <label>
      Password
      <input type="password" name="password" required />
    </label>
    <button type="submit">Enter</button>
  </form>
{:else}
  <h1>Reviewer Panel</h1>

  <p>
    Logged in as <strong>{user.username ?? 'Unknown'}</strong>
  </p>

  {#if message}
    <p>{message}</p>
  {/if}

  <h2>Pending submissions</h2>

  {#if !submissions || submissions.length === 0}
    <p>No pending submissions LETS FREAKING GOOOOOOO</p>
  {:else}
    <ul>
      {#each submissions as s}
        <li>
          <div>
            <strong>{s.username}</strong> · project: {s.projectId}
          </div>
          <div>
            Coins spent: {s.coinsSpent} · Hours: {s.hackatimeHours}
          </div>

          <!-- approving projects -->
          <button
            on:click={async () => {
              loadingId = s.id;
              message = '';
              try {
                const res = await fetch('/api/blackhole/approve', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    submissionId: s.id,
                    reviewer: user.username ?? 'reviewer'
                  })
                });

                if (!res.ok) {
                  const text = await res.text();
                  throw new Error(text || 'Failed to approve');
                }

                const updated = await res.json();
                submissions = submissions.filter((x: any) => x.id !== s.id);
                message = `Approved submission ${updated.id}`;
              } catch (err) {
                const e = err as Error;
                message = e.message ?? 'Error approving';
              } finally {
                loadingId = null;
              }
            }}
            disabled={loadingId === s.id}
          >
            {#if loadingId === s.id}Approving...{:else}Approve{/if}
          </button>

          <!-- rejecting projects -->
          <button
            on:click={async () => {
              const reason =
                window.prompt('Reason for rejection? (optional)', '') ?? '';
              loadingId = s.id;
              message = '';
              
              try {
                const res = await fetch('/api/blackhole/reject', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    submissionId: s.id,
                    reviewer: user.username ?? 'reviewer',
                    reason
                  })
                });

                if (!res.ok) {
                  const text = await res.text();
                  throw new Error(text || 'Failed to reject');
                }
        
                const updated = await res.json();
                submissions = submissions.filter((x: any) => x.id !== s.id);
                message = `Rejected submission ${updated.id}`;
              } catch (err) {
                const e = err as Error;
                message = e.message ?? 'Error rejecting';
              } finally {
                loadingId = null;
              }
            }}
            disabled={loadingId === s.id}
          >
            {#if loadingId === s.id}Rejecting...{:else}Reject{/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
{/if}

<style>
  ul {
    list-style: none;
    padding: 0;
  }
  li {
    border: 1px solid #444;
    padding: 8px;
    margin: 6px 0;
  }
  button {
    margin-right: 6px;
  }
</style>

