// The Privacy and Terms pages are written in the admin as plain text with a
// few simple marks, and shown without ever treating the text as HTML:
//   a blank line starts a new paragraph, "- " starts a bullet,
//   **words** are bold, [words](/address) is a link,
//   {email} and {address} show the site's email and office address.

export type Inline = { kind: "text" | "bold"; text: string } | { kind: "link"; text: string; href: string };
export type Block = { kind: "paragraph"; parts: Inline[] } | { kind: "list"; items: Inline[][] };

// A site page, a web page, an email or a phone number; nothing that could run.
const allowedLink = /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i;
const marks = /\*\*(.+?)\*\*|\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)|\{(email|address)\}/g;

function inline(line: string, values: { email: string; address: string }): Inline[] {
  const parts: Inline[] = [];
  let from = 0;
  for (const match of line.matchAll(marks)) {
    if (match.index > from) parts.push({ kind: "text", text: line.slice(from, match.index) });
    const [whole, bold, words, href, token] = match;
    if (bold !== undefined) parts.push({ kind: "bold", text: bold });
    else if (token === "email") parts.push({ kind: "link", text: values.email, href: `mailto:${values.email}` });
    else if (token === "address") parts.push({ kind: "text", text: values.address });
    else if (allowedLink.test(href)) parts.push({ kind: "link", text: words, href });
    else parts.push({ kind: "text", text: words });
    from = match.index + whole.length;
  }
  if (from < line.length) parts.push({ kind: "text", text: line.slice(from) });
  return parts;
}

export function legalBlocks(body: string, values: { email: string; address: string }): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", parts: inline(paragraph.join(" "), values) });
    if (list.length) blocks.push({ kind: "list", items: list.map((item) => inline(item, values)) });
    paragraph = [];
    list = [];
  };
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) flush();
    else if (line.startsWith("- ")) {
      if (paragraph.length) flush();
      list.push(line.slice(2).trim());
    } else {
      if (list.length) flush();
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}
