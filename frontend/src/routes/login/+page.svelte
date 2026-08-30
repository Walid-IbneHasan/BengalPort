<script lang="ts">
  import { api } from "$lib/api";
  let mode = "login",
    name = "",
    email = "",
    password = "",
    error = "",
    loading = false;
  async function submit() {
    loading = true;
    error = "";
    try {
      const data: any = await api(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      localStorage.setItem("bp_token", data.token);
      localStorage.setItem("bp_user", JSON.stringify(data.user));
      location.href = data.user.role === "ADMIN" ? "/admin" : "/dashboard";
    } catch (e) {
      error = e instanceof Error ? e.message : "Unable to continue";
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Account — Bengal Port</title></svelte:head>
<section class="section auth">
  <div class="authbox">
    <img src="/images/logo.webp" alt="Bengal Port" />
    <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
    <p>Access applications, payments and receipts.</p>
    {#if error}<p class="error">{error}</p>{/if}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {#if mode === "register"}<div class="field">
          <label for="name">Full name</label><input
            id="name"
            bind:value={name}
            required
          />
        </div>{/if}
      <div class="field">
        <label for="email">Email</label><input
          id="email"
          type="email"
          bind:value={email}
          required
        />
      </div>
      <div class="field">
        <label for="password">Password</label><input
          id="password"
          type="password"
          bind:value={password}
          minlength="8"
          required
        />
      </div>
      <button class="btn"
        >{loading
          ? "PLEASE WAIT…"
          : mode === "login"
            ? "LOGIN"
            : "REGISTER"}</button
      >
    </form>
    <button
      class="switch"
      onclick={() => (mode = mode === "login" ? "register" : "login")}
      >{mode === "login"
        ? "New to Bengal Port? Register"
        : "Already registered? Login"}</button
    >
  </div>
</section>

<style>
  .auth {
    min-height: 650px;
    display: grid;
    place-items: center;
    background: #f1f4f6;
  }
  .authbox {
    width: min(440px, 92vw);
    background: white;
    padding: 40px;
    border-radius: 20px;
    box-shadow: var(--shadow);
    text-align: center;
  }
  .authbox img {
    width: 86px;
    height: 86px;
    border-radius: 50%;
  }
  .authbox form {
    text-align: left;
    display: grid;
    gap: 16px;
  }
  .authbox .btn {
    margin-top: 8px;
  }
  .switch {
    border: 0;
    background: none;
    color: var(--gold);
    font-weight: 800;
    margin-top: 22px;
  }
</style>
