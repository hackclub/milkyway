<script lang="ts">
  export let data: any;
  const perms = data?.perms ?? [];

  const canBasic =  perms.includes('Basic');
  const canSecond = perms.includes('Second');
  const canBlackhole = perms.includes('Blackhole');
  const canAdmin = perms.includes('Admin');

</script>

<svelte:head>
  <title>Reviewers</title>
</svelte:head>

<h1>Reviewer Hub!</h1>

<main class="page">
    <h1>Reviewer</h1>

    <p class="muted">your permissions: {perms.length ? perms.join(', ') : 'none'}</p>

    <div class="buttons">
        {#if canBlackhole}a
            <a class="btn" href="/reviewer/blackhole">&gt; blackhole queue</a>
        {/if}

        {#if canBasic}
            <a class="btn" href="/reviewer/basic">&gt; basic queue</a>
        {/if}

        {#if canSecond}
            <a class="btn" href="/reviewer/second">&gt; second queue</a>
        {/if}

        {#if canAdmin}
            <a class="btn" href="/reviewer/admin">&gt; admin queue</a>
        {/if}

        {#if !canBlackhole && !canBasic && !canSecond && !canAdmin}
            <p class="muted">you don't have any perms... why are you here?</p>
        {/if}
    </div>
</main>

<style>
    .page { 
        min-height: 100vh;
        background: #000;
        color: #fff;
        padding: 24px;
        font-family: system-ui;
    }
    
    .muted { 
        opacity: 0.75;
    }

    .buttons {
        display:flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 16px;
        
    }

    .btn {
        display:block;
    }

    .btn:hover {
        border-color: rgba();
    }
</style>