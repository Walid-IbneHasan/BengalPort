import { brotliCompressSync, constants, gzipSync } from "node:zlib";

// Pages are built per request, so unlike the site's scripts and styles they
// have no compressed copy waiting on disk. Compressing them here keeps a phone
// on a slow connection from downloading 100 KB of repetitive HTML.
const WORTH_COMPRESSING = 1024;

export async function compressHtml(response: Response, accepted: string): Promise<Response> {
  const isPage = /^text\/html/i.test(response.headers.get("content-type") ?? "");
  const brotli = /\bbr\b/.test(accepted);
  if (!isPage || !response.body || response.headers.has("content-encoding") || (!brotli && !/\bgzip\b/.test(accepted))) return response;

  const page = Buffer.from(await response.arrayBuffer());
  const { status, statusText, headers } = response;
  if (page.length < WORTH_COMPRESSING) return new Response(page, { status, statusText, headers });

  // Quality 4 is close to gzip's speed with a noticeably smaller result.
  const compressed = brotli ? brotliCompressSync(page, { params: { [constants.BROTLI_PARAM_QUALITY]: 4 } }) : gzipSync(page);
  headers.set("content-encoding", brotli ? "br" : "gzip");
  headers.set("vary", [headers.get("vary"), "Accept-Encoding"].filter(Boolean).join(", "));
  headers.delete("content-length");
  return new Response(compressed, { status, statusText, headers });
}
