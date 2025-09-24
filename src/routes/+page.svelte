<script>
import LinkButton from '$lib/components/LinkButton.svelte';
import ShortTextInput from '$lib/components/ShortTextInput.svelte';


let { data } = $props();
console.log("data: ", data)


let sendOTPPromise = $state(/** @type {Promise<any> | null} */ (null));
let checkOTPPromise = $state(null);
let email = $state("");
let otp = $state("");


async function sendOTP() {
  return new Promise((fulfil, reject) => {
    fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        fulfil(data);
        return;
      }
      reject(new Error(data.error?.message || JSON.stringify(data.error)));
    })
    .catch(err => {
      reject(new Error(err.message || err.toString()));
    });
  });
}


async function checkOTP() {
  return new Promise((fulfil, reject) => {
    fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        fulfil(data);
        return;
      }
      reject(new Error(data.error?.message || JSON.stringify(data.error)));
    })
    .catch(err => {
      reject(new Error(err.message || err.toString()));
    });
  });

}
</script>

<main>
<img class="logo-bg" src="milkyway.png" />


<div class="login-inputs">
{#if data.user}
  <p>you're already logged in</p>
  <LinkButton href="/home" showarrow>enter the milkyway</LinkButton>

{:else}

  {#if !sendOTPPromise}

  <ShortTextInput bind:value={email} placeholder="enter email to begin" onclick={() => sendOTPPromise = sendOTP() }>send otp</ShortTextInput>

  {:else}
    {#await sendOTPPromise}
    <p>sending...</p>

    {:then response_answer}

      {#if !checkOTPPromise}
        <p>otp sent, input otp</p>

        <ShortTextInput bind:value={otp} placeholder="input otp" onclick={() => checkOTPPromise = checkOTP() }>submit otp</ShortTextInput>

      {:else}
        {#await checkOTPPromise}
        <p>verifying...</p>

        {:then response_answer}
        <p>you're in!</p>
        {:catch error}
        <ShortTextInput bind:value={otp} placeholder="input otp (check email!)" onclick={() => checkOTPPromise = checkOTP() }>submit otp</ShortTextInput>

        <p>checking error occured: {error}</p>
        {/await}

      {/if}

    {:catch error}
    <ShortTextInput bind:value={email} placeholder="enter email to begin" onclick={() => sendOTPPromise = sendOTP() }>send otp</ShortTextInput>

    <p>sending otp error occured: {error}</p>
    {/await}
  {/if}

{/if}

</div>


</main>

<style>

main {
  width: 100%;
  background-color: var(--blue);
  height: 100%;
}

.logo-bg {
  width: 100%;
  margin-bottom: -20%;
}

.login-inputs {
  display: flex;
  flex-flow: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}




</style>
