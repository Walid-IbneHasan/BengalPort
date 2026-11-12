<script lang="ts">
  import { problemText } from "$lib/problem";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { api, ApiError } from "$lib/api";
  import { googleClientId as publicGoogleClientId } from "$lib/config";
  import { afterLogin } from "$lib/safe-next";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import { cmsContent } from "$lib/cms";
  import type { LoginContent } from "$lib/site-pages";
  import {
    ArrowRight,
    Check,
    KeyRound,
    Mail,
    ShieldCheck,
  } from "lucide-svelte";
  export let data: { content: LoginContent };
  type Mode =
    "login" | "register" | "verify" | "twoFactor" | "forgot" | "reset";
  let mode: Mode = "login",
    name = "",
    phone = "",
    email = "",
    password = "",
    confirm = "",
    code = "",
    challengeId = "",
    developmentCode = "",
    error = "",
    notice = "",
    loading = false;
  const googleClientId = publicGoogleClientId();
  // A notice sits above the form, so bring it into view if the button pressed
  // was further down the page.
  const reveal = (node: HTMLElement) => node.scrollIntoView({ block: "nearest" });
  // Moving between forms carries the email across, never a password or a code.
  const changeMode = (next: Mode) => {
    mode = next;
    password = confirm = code = developmentCode = error = notice = "";
  };
  $: heading = {
    login: "Welcome back",
    register: "Create your account",
    verify: "Verify your email",
    twoFactor: "Confirm it’s you",
    forgot: "Reset your password",
    reset: "Choose a new password",
  }[mode];
  const save = (data: any) => {
    localStorage.setItem("bp_token", data.token);
    localStorage.setItem("bp_user", JSON.stringify(data.user));
    goto(data.user.mustChangePassword ? "/profile" : afterLogin(page.url.searchParams.get("next"), data.user.role));
  };
  // Another code for the screen asking for one. The email is known by then.
  async function resendCode() {
    loading = true;
    error = notice = "";
    try {
      const reset = mode === "reset";
      const data: any = await api(reset ? "/auth/forgot-password" : "/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (data.challengeId) setChallenge(reset ? "reset" : "verify", data);
      else notice = "If this code is still needed, a new one has been sent.";
    } catch (e) {
      error = problemText(e, "A new code could not be sent");
    } finally {
      loading = false;
    }
  }
  const setChallenge = (next: Mode, data: any) => {
    mode = next;
    code = "";
    challengeId = data.challengeId;
    developmentCode = data.developmentCode || "";
    notice = data.delivered
      ? `We sent a six-digit code to ${email}.`
      : "Email delivery is not configured yet. Use the development code shown below.";
  };
  async function submit() {
    loading = true;
    error = "";
    notice = "";
    try {
      if (mode === "register") {
        if (password !== confirm) throw new Error("Passwords do not match.");
        const data: any = await api("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name,
            phone: phone || undefined,
            email,
            password,
          }),
        });
        setChallenge("verify", data);
      } else if (mode === "login") {
        const data: any = await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        data.requiresTwoFactor ? setChallenge("twoFactor", data) : save(data);
      } else if (mode === "verify") {
        save(
          await api("/auth/verify-email", {
            method: "POST",
            body: JSON.stringify({ challengeId, code }),
          }),
        );
      } else if (mode === "twoFactor") {
        save(
          await api("/auth/verify-2fa", {
            method: "POST",
            body: JSON.stringify({ challengeId, code }),
          }),
        );
      } else if (mode === "forgot") {
        const data: any = await api("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        if (data.challengeId) setChallenge("reset", data);
        else
          notice =
            "If this email has a password account, a reset code has been sent.";
      } else {
        if (password !== confirm) throw new Error("Passwords do not match.");
        await api("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ challengeId, code, password }),
        });
        changeMode("login");
        notice = "Password updated. You can now sign in.";
      }
    } catch (e) {
      if (
        e instanceof ApiError &&
        e.code === "EMAIL_NOT_VERIFIED" &&
        e.details
      ) {
        email = e.details.email;
        setChallenge("verify", e.details);
      } else error = problemText(e, "Unable to continue");
    } finally {
      loading = false;
    }
  }
  async function googleLogin(credential: string) {
    loading = true;
    error = "";
    try {
      save(
        await api("/auth/google", {
          method: "POST",
          body: JSON.stringify({ credential }),
        }),
      );
    } catch (e) {
      error = problemText(e, "Google sign-in failed");
    } finally {
      loading = false;
    }
  }
  onMount(() => {
    if (!googleClientId) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      const g = (window as any).google;
      g.accounts.id.initialize({
        client_id: googleClientId,
        callback: (r: any) => googleLogin(r.credential),
      });
      // The button is an iframe of a fixed width: never wider than its slot,
      // so a 320px phone does not scroll sideways.
      const slot = document.getElementById("google-button");
      g.accounts.id.renderButton(slot, {
        theme: "outline",
        size: "large",
        width: Math.min(360, Math.floor(slot?.parentElement?.clientWidth || 360)),
        text: "continue_with",
        shape: "pill",
      });
    };
    document.head.appendChild(script);
  });
</script>

<svelte:head><title>{heading} — Bengal Port</title></svelte:head>
<section class="auth-shell">
  <div class="story">
    <a href="/" class="brand"
      ><img src={$cmsContent.brand.logo} alt={$cmsContent.brand.name} /><span>{$cmsContent.brand.name}</span
      ></a
    >
    <div>
      <span class="eyebrow">{data.content.story.eyebrow}</span>
      <h1>{data.content.story.titleLine1}<br />{data.content.story.titleLine2}</h1>
      <p>
        {data.content.story.description}
      </p>
      <ul>
        {#each data.content.story.points as point}<li><Check /> {point}</li>{/each}
      </ul>
    </div>
  </div>
  <div class="form-side">
    <div class="authbox">
      <div class="icon">
        <svelte:component
          this={mode === "verify" || mode === "twoFactor"
            ? ShieldCheck
            : mode === "forgot" || mode === "reset"
              ? KeyRound
              : Mail}
        />
      </div>
      <span class="step"
        >{mode === "login"
          ? "MEMBER SIGN IN"
          : mode === "register"
            ? "CREATE ACCOUNT"
            : "SECURE VERIFICATION"}</span
      >
      <h2>{heading}</h2>
      <p>
        {mode === "verify" || mode === "twoFactor"
          ? "Enter the six-digit code. It expires in 10 minutes."
          : mode === "forgot"
            ? "We’ll email you a secure six-digit reset code."
            : mode === "reset"
              ? "Enter your code and a strong new password."
              : data.content.intro}
      </p>
      {#if notice}<div class="notice success" role="status" use:reveal>
          {notice}
        </div>{/if}{#if developmentCode}<div class="dev-code">
          Development code: <b>{developmentCode}</b>
        </div>{/if}
      <form
        onsubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {#if mode === "register"}<label
            ><span>Full name</span><input
              bind:value={name}
              autocomplete="name"
              required
              minlength="2"
              maxlength="100"
            /></label
          ><label
            ><span>Phone number <small>Optional</small></span><input
              bind:value={phone}
              autocomplete="tel"
              inputmode="tel"
              minlength="7"
              maxlength="30"
            /></label
          >{/if}
        {#if ["login", "register", "forgot"].includes(mode)}<label
            ><span>Email address</span><input
              bind:value={email}
              type="email"
              autocomplete="email"
              required
            /></label
          >{/if}
        {#if ["verify", "twoFactor", "reset"].includes(mode)}<label
            ><span>Six-digit code</span><input
              class="otp"
              bind:value={code}
              inputmode="numeric"
              autocomplete="one-time-code"
              pattern={"[0-9]{6}"}
              maxlength="6"
              required
            /></label
          >{/if}
        {#if ["login", "register", "reset"].includes(mode)}<label
            ><span>{mode === "reset" ? "New password" : "Password"}</span>
            <PasswordInput
              bind:value={password}
              autocomplete={mode === "login"
                ? "current-password"
                : "new-password"}
              minlength={8}
              required
            />
            {#if mode !== "login"}<small
                >8+ characters with uppercase, lowercase and a number.</small
              >{/if}</label
          >{/if}
        {#if mode === "register" || mode === "reset"}<label
            ><span>Confirm password</span><PasswordInput
              bind:value={confirm}
              autocomplete="new-password"
              required
            /></label
          >{/if}
        {#if mode === "verify" || mode === "reset"}<button
            type="button"
            class="forgot"
            disabled={loading}
            onclick={resendCode}>Send a new code</button
          >{/if}
        {#if mode === "login"}<button
            type="button"
            class="forgot"
            onclick={() => changeMode("forgot")}>Forgot password?</button
          >{/if}
        {#if error}<div class="notice error" role="alert">
            {error}
          </div>{/if}
        <button class="primary" disabled={loading}
          ><span
            >{loading
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : mode === "register"
                  ? "Create account"
                  : mode === "forgot"
                    ? "Send reset code"
                    : mode === "reset"
                      ? "Update password"
                      : "Verify and continue"}</span
          ><ArrowRight /></button
        >
      </form>
      {#if googleClientId && (mode === "login" || mode === "register")}<div class="divider">
          <span>or</span>
        </div>
        <div id="google-button" class="google"></div>{/if}
      <div class="switches">
        {#if mode === "login"}<button
            onclick={() => changeMode("register")}>New here? <b>Create an account</b></button
          >{:else}<button
            onclick={() => changeMode("login")}>← Back to sign in</button
          >{/if}<a href="/apply">{data.content.withoutAccount}</a>
      </div>
    </div>
  </div>
</section>

<style>
  .auth-shell {
    min-height: calc(100svh - 9rem);
    display: grid;
    background: #f4f6f6;
  }
  .story {
    display: none;
  }
  .form-side {
    display: grid;
    place-items: center;
    padding: 2rem 1rem;
  }
  .authbox {
    width: min(100%, 29rem);
    background: #fff;
    border: 1px solid #e1e6e7;
    border-radius: 1.35rem;
    padding: clamp(1.4rem, 5vw, 2.4rem);
    box-shadow: 0 1.5rem 4rem rgba(17, 42, 67, 0.1);
  }
  .icon {
    width: 3rem;
    height: 3rem;
    display: grid;
    place-items: center;
    border-radius: 0.9rem;
    background: #f8efd9;
    color: #9b6d16;
    margin-bottom: 1.3rem;
  }
  .step {
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    font-weight: 800;
    color: #a77720;
  }
  .authbox h2 {
    font-size: clamp(1.9rem, 8vw, 2.6rem);
    letter-spacing: -0.04em;
    color: #193652;
    margin: 0.5rem 0;
  }
  .authbox > p {
    color: #68798a;
    line-height: 1.6;
    margin: 0 0 1.4rem;
  }
  .notice,
  .dev-code {
    padding: 0.8rem 1rem;
    border-radius: 0.7rem;
    margin: 0.75rem 0;
    font-size: 0.86rem;
  }
  .notice.error {
    margin: 0;
    background: #fff0f0;
    color: #942d35;
  }
  .notice.success {
    /* Clears the sticky header when it is scrolled into view. */
    scroll-margin-top: 10rem;
    background: #edf8f1;
    color: #286542;
  }
  .dev-code {
    background: #fff7df;
    color: #74500d;
  }
  .dev-code b {
    letter-spacing: 0.2em;
  }
  form {
    display: grid;
    gap: 1rem;
  }
  label {
    display: grid;
    gap: 0.45rem;
    color: #263f58;
    font-weight: 700;
    font-size: 0.86rem;
  }
  label span {
    display: flex;
    justify-content: space-between;
  }
  label small {
    font-weight: 500;
    color: #84909c;
  }
  input {
    width: 100%;
    min-height: 3rem;
    border: 1px solid #d6dfe2;
    border-radius: 0.7rem;
    padding: 0.75rem 0.9rem;
    font: inherit;
    color: #17334e;
    outline: none;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease;
  }
  input:focus {
    border-color: #bd8b29;
    box-shadow: 0 0 0 0.22rem rgba(198, 150, 54, 0.14);
  }
  .otp {
    text-align: center;
    font-size: 1.4rem;
    letter-spacing: 0.45em;
    font-weight: 800;
  }
  .forgot {
    justify-self: end;
    border: 0;
    background: none;
    color: #9b6d16;
    font-weight: 700;
    padding: 0.2rem;
    cursor: pointer;
  }
  .primary {
    min-height: 3.2rem;
    border: 0;
    border-radius: 0.8rem;
    background: #173652;
    color: #fff;
    padding: 0.7rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 800;
    cursor: pointer;
    transition:
      transform 150ms cubic-bezier(0.23, 1, 0.32, 1),
      background-color 180ms ease;
  }
  .primary:active {
    transform: scale(0.98);
  }
  .primary:disabled {
    opacity: 0.65;
    cursor: wait;
  }
  .primary svg {
    width: 1.15rem;
  }
  .divider {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    color: #9aa4ad;
    margin: 1.25rem 0;
  }
  .divider:before,
  .divider:after {
    content: "";
    height: 1px;
    background: #e3e7e8;
    flex: 1;
  }
  .google {
    display: grid;
    place-items: center;
    min-height: 2.75rem;
  }
  .google-placeholder {
    width: 100%;
    min-height: 2.9rem;
    border: 1px solid #dfe3e5;
    border-radius: 1.5rem;
    background: #fafbfb;
    color: #84909c;
  }
  .switches {
    display: grid;
    gap: 0.75rem;
    text-align: center;
    margin-top: 1.35rem;
  }
  .switches button {
    border: 0;
    background: none;
    color: #556a7d;
    cursor: pointer;
  }
  .switches b,
  .switches a {
    color: #9b6d16;
  }
  .switches a {
    font-size: 0.85rem;
    text-decoration: none;
  }
  @media (min-width: 64rem) {
    .auth-shell {
      grid-template-columns: minmax(25rem, 0.9fr) minmax(32rem, 1.1fr);
    }
    .story {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: clamp(2.5rem, 5vw, 5rem);
      background: linear-gradient(145deg, #102d4b, #173f61);
      color: #fff;
      position: relative;
      overflow: hidden;
    }
    .story:after {
      content: "";
      position: absolute;
      width: 30rem;
      height: 30rem;
      border: 1px solid rgba(221, 178, 76, 0.2);
      border-radius: 50%;
      right: -13rem;
      bottom: -15rem;
      box-shadow:
        0 0 0 5rem rgba(255, 255, 255, 0.025),
        0 0 0 10rem rgba(255, 255, 255, 0.018);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 1rem;
      color: #fff;
      text-decoration: none;
      font-weight: 800;
      letter-spacing: 0.04em;
    }
    .brand img {
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
    }
    .story > div {
      position: relative;
      z-index: 1;
      max-width: 38rem;
    }
    .eyebrow {
      color: #e0b558;
      font-size: 0.72rem;
      letter-spacing: 0.16em;
      font-weight: 800;
    }
    .story h1 {
      font-size: clamp(2.8rem, 4.5vw, 4.8rem);
      line-height: 1.05;
      letter-spacing: -0.055em;
      margin: 1rem 0 1.4rem;
    }
    .story p {
      max-width: 34rem;
      color: #cfdae3;
      line-height: 1.75;
    }
    .story ul {
      list-style: none;
      padding: 0;
      display: grid;
      gap: 0.8rem;
      margin-top: 2rem;
    }
    .story li {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      color: #edf2f5;
    }
    .story li svg {
      width: 1.1rem;
      color: #dfb24d;
    }
    .form-side {
      padding: 3rem;
    }
  }
  @media (hover: hover) and (pointer: fine) {
    .primary:hover {
      background: #204663;
      transform: translateY(-0.08rem);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .primary,
    input {
      transition-duration: 0.01ms;
    }
  }
</style>
