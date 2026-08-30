<script lang="ts">
  import { ImageUp, LoaderCircle, CheckCircle2 } from "lucide-svelte";

  let {
    label,
    value,
    recommendation = "A landscape image works best here.",
    purpose = "website image",
    onchange,
  }: {
    label: string;
    value: string;
    recommendation?: string;
    purpose?: string;
    onchange: (value: string) => void;
  } = $props();
  let uploading = $state(false);
  let message = $state("");
  let error = $state("");
  let localPreview = $state("");

  async function upload(file?: File) {
    if (!file) return;
    uploading = true;
    error = "";
    message = "";
    if (localPreview) URL.revokeObjectURL(localPreview);
    localPreview = URL.createObjectURL(file);
    try {
      const token = localStorage.getItem("bp_token");
      if (!token) throw new Error("Admin sign-in required");
      const body = new FormData();
      body.append("image", file, file.name);
      const apiOrigin =
        import.meta.env.PUBLIC_API_URL || "http://localhost:4000/api";
      const response = await fetch(
        `${apiOrigin}/admin/media?purpose=${encodeURIComponent(purpose)}`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body,
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload?.error?.message || "Image upload failed");
      onchange(payload.data.url);
      const kb = Math.max(1, Math.round(payload.data.byteSize / 1024));
      message = `Optimized to WebP · ${payload.data.width}×${payload.data.height} · ${kb} KB`;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Image upload failed";
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
        localPreview = "";
      }
    } finally {
      uploading = false;
    }
  }
</script>

<div class="media-field">
  <div class="field-head">
    <span>{label}</span><small>{recommendation}</small>
  </div>
  <div class="media-layout">
    <div
      class="preview"
      class:portrait={recommendation.toLowerCase().includes("portrait")}
    >
      {#if value || localPreview}<img
          src={localPreview || value}
          alt="Current CMS selection"
        />{:else}<ImageUp size={28} /><span>No image selected</span>{/if}
    </div>
    <div class="controls">
      <label class="picker" class:busy={uploading}>
        {#if uploading}<LoaderCircle class="spin" size={18} /><span
            >Optimizing…</span
          >{:else}<ImageUp size={18} /><span>Choose image</span>{/if}
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onchange={(event) => upload(event.currentTarget.files?.[0])}
        />
      </label>
      <p>
        PNG, JPEG, TIFF, WebP or AVIF. The server auto-rotates and converts the
        upload to optimized WebP.
      </p>
      {#if message}<div class="result">
          <CheckCircle2 size={15} />{message}
        </div>{/if}
      {#if error}<div class="upload-error" role="alert">{error}</div>{/if}
      <input
        class="path"
        aria-label={`${label} path`}
        {value}
        oninput={(event) => onchange(event.currentTarget.value)}
      />
    </div>
  </div>
</div>

<style>
  .media-field {
    display: grid;
    gap: 0.5rem;
    grid-column: 1/-1;
  }
  .field-head {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .field-head > span {
    font-size: 0.75rem;
    font-weight: 780;
    color: #334b63;
  }
  .field-head small {
    font-size: 0.75rem;
    line-height: 1.45;
    color: #7a6640;
  }
  .media-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.8rem;
    border: 1px solid #dce3e7;
    border-radius: 0.8rem;
    padding: 0.75rem;
    background: #f8fafb;
  }
  .preview {
    aspect-ratio: 16/9;
    min-height: 8rem;
    overflow: hidden;
    border-radius: 0.65rem;
    background: #e8edf0;
    color: #738292;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 0.5rem;
  }
  .preview.portrait {
    aspect-ratio: 4/5;
  }
  .preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .controls {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.55rem;
    min-width: 0;
  }
  .picker {
    position: relative;
    min-height: 2.75rem;
    padding: 0.65rem 0.85rem;
    border-radius: 0.65rem;
    background: #17304f;
    color: #fff;
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    font-weight: 750;
    cursor: pointer;
  }
  .picker input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
  .picker.busy {
    opacity: 0.72;
    cursor: wait;
  }
  .controls p {
    font-size: 0.75rem;
    line-height: 1.5;
    color: #667789;
    margin: 0;
  }
  .path {
    width: 100%;
    min-height: 2.75rem;
    border: 1px solid #d5dde2;
    border-radius: 0.6rem;
    padding: 0.65rem 0.75rem;
    background: #fff;
  }
  .result {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: #276541;
    font-size: 0.75rem;
  }
  .upload-error {
    color: #942f2f;
    font-size: 0.75rem;
  }
  .spin {
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (min-width: 40rem) {
    .media-layout {
      grid-template-columns: minmax(12rem, 0.7fr) minmax(0, 1.3fr);
      align-items: center;
    }
    .preview.portrait {
      max-height: 18rem;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spin {
      animation: none;
    }
  }
</style>
