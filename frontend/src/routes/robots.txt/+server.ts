import type { RequestHandler } from './$types';

// Private and account pages stay out of search results.
export const GET: RequestHandler = ({ url }) =>
  new Response(
    [
      'User-agent: *',
      'Disallow: /admin',
      'Disallow: /dashboard',
      'Disallow: /profile',
      'Disallow: /login',
      'Disallow: /receipt',
      'Disallow: /payment',
      '',
      `Sitemap: ${url.origin}/sitemap.xml`,
      '',
    ].join('\n'),
    { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } },
  );
