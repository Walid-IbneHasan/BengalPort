import nodeAdapter from '@sveltejs/adapter-node';
import vercelAdapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// The website is built for wherever it is being deployed: Vercel sets VERCEL
// while it builds; everywhere else (cPanel, a VPS, `node build`) gets a plain
// Node server.
const adapter = process.env.VERCEL ? vercelAdapter() : nodeAdapter();

// What a page may load. The API's own address is added when the site runs
// (src/hooks.server.ts). Google sign-in and the Cloudflare check on the public
// forms are the only outside scripts; images may come from any HTTPS address
// because content editors can link to them.
const google = 'https://accounts.google.com/gsi/';
const cloudflare = 'https://challenges.cloudflare.com';
const csp = {
  directives: {
    'default-src': ['self'],
    'script-src': ['self', `${google}client`, cloudflare],
    'style-src': ['self', 'unsafe-inline', `${google}style`],
    'img-src': ['self', 'data:', 'blob:', 'https:'],
    'font-src': ['self', 'data:'],
    'connect-src': ['self', google],
    'frame-src': [google, cloudflare],
    'frame-ancestors': ['none'],
    'object-src': ['none'],
    'base-uri': ['self'],
    'form-action': ['self']
  }
};

export default { preprocess: vitePreprocess(), kit: { adapter, csp } };
