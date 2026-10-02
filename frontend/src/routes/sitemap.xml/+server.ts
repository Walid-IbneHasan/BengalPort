import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import type { RequestHandler } from './$types';

const pages = ['/', '/about', '/services', '/business', '/education', '/healthcare', '/umrah', '/opportunities', '/apply', '/contact', '/privacy', '/terms'];
const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: RequestHandler = async ({ url, fetch }) => {
  const opportunities = (await fetchData<{ slug: string; updatedAt: string }[]>(fetch, `${apiUrl()}/opportunities`)) ?? [];
  const entries = [
    ...pages.map((path) => `<url><loc>${escape(url.origin + path)}</loc></url>`),
    ...opportunities.map(
      (item) => `<url><loc>${escape(`${url.origin}/opportunities/${item.slug}`)}</loc><lastmod>${item.updatedAt.slice(0, 10)}</lastmod></url>`,
    ),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`,
    { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } },
  );
};
