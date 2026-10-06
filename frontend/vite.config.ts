import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';

// In development, vite-plugin-svelte serves a component's CSS from the cache
// its compile step fills. When that cache has nothing for a component (it has
// not been compiled yet, or a file change emptied it), Vite falls back to
// reading the .svelte file itself and serves the whole file as the stylesheet.
// The browser keeps whatever parses, so a rule such as `header { ... }`
// escapes its component and lands on the site header. Running the component
// through the dev server's own transform first fills the cache; that call is
// answered from the module graph when the component is already compiled.
// Production builds compile everything up front and never take this path.
function svelteStylesAfterCompile(): Plugin {
  const normalize = (file: string) => file.replace(/\\/g, '/');
  return {
    name: 'bengal-port:svelte-styles-after-compile',
    apply: 'serve',
    enforce: 'pre',
    async load(id) {
      const match = /^(.+\.svelte)\?svelte&type=style/.exec(id);
      const environment = this.environment;
      if (!match || environment.mode !== 'dev') return;
      const file = normalize(match[1]);
      const root = normalize(environment.config.root);
      const url = file.startsWith(`${root}/`) ? file.slice(root.length) : `/@fs/${file}`;
      await environment.transformRequest(url);
    },
  };
}

export default defineConfig({
  plugins: [svelteStylesAfterCompile(), sveltekit()],
  server: { port: 5173, allowedHosts: true },
});
