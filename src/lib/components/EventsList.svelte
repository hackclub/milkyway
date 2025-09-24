<script>
  let promise;
  let events = null;

  import { onMount } from 'svelte';
  onMount(() => {
    promise = fetch('/api/get-events')
      .then(res => res.json())
      .then(data => {
        events = data.events;
      })
  });
</script>

{#await promise}
  <p>Loading…</p>
{:then data}
  {#if events}
    {#each events as event}
    <p>{#if event.name}{event.name}{/if}</p>
    {/each}
  {/if}
{:catch err}
  <p>Error: {err.message}</p>
{/await}
