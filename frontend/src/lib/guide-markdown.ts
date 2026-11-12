// The admin guide (docs/ADMIN-GUIDE.md) shown inside the admin: split into
// its English and Bangla halves, and turned into HTML. Only the Markdown the
// guide uses is understood: headings, paragraphs, lists (nested), tables,
// fenced code, rules, bold, italics, code and links. Text is escaped first,
// so nothing in the file can add its own HTML.

export type GuideLanguage = "en" | "bn";

const BANGLA_HEADING = "# বাংলা নির্দেশিকা";
const ENGLISH_HEADING = "# English guide";

// The two halves, without the shared title at the top of the file.
export function splitGuide(markdown: string): Record<GuideLanguage, string> {
  const text = markdown.replace(/\r\n/g, "\n");
  const enStart = text.indexOf(`${ENGLISH_HEADING}\n`);
  const bnStart = text.indexOf(`${BANGLA_HEADING}\n`);
  if (enStart < 0 || bnStart < 0) return { en: text, bn: text };
  const english = text.slice(enStart, bnStart).replace(/\n-{3,}\s*$/, "").trimEnd();
  return { en: english, bn: text.slice(bnStart).trimEnd() };
}

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// GitHub's rule for heading anchors, so the contents lists keep working.
export function slug(heading: string) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "")
    .replace(/ /g, "-");
}

// Bold, italics, code and links inside a line (already escaped).
function inline(raw: string) {
  const codes: string[] = [];
  let text = escape(raw).replace(/`([^`]+)`/g, (_, code) => `\u0000${codes.push(code) - 1}\u0000`);
  text = text
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
      const safe = /^(#|https?:\/\/|\/)/.test(href) ? href : "#";
      const outside = /^https?:\/\//.test(safe);
      return `<a href="${safe}"${outside ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(“"'—–-])\*([^*\s][^*]*?)\*(?=[\s.,;:!?)”"'—–-]|$)/g, "$1<em>$2</em>");
  return text.replace(/\u0000(\d+)\u0000/g, (_, index) => `<code>${codes[Number(index)]}</code>`);
}

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

type ListFrame = { indent: number; kind: "ul" | "ol" };

export function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  const used = new Map<string, number>();
  let paragraph: string[] = [];
  const lists: ListFrame[] = [];

  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${paragraph.map(inline).join("<br>")}</p>`);
    paragraph = [];
  };
  const closeLists = (toIndent = -1) => {
    while (lists.length && lists[lists.length - 1].indent > toIndent) out.push(`</li></${lists.pop()!.kind}>`);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code: kept exactly, including the diagram.
    const fence = /^(\s*)```/.exec(line);
    if (fence) {
      flushParagraph();
      const body: string[] = [];
      while (++i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i].slice(fence[1].length));
      // Not indented: the code stands on its own, after any list.
      if (!fence[1].length) closeLists();
      out.push(`<pre><code>${escape(body.join("\n"))}</code></pre>`);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      closeLists();
      const base = slug(heading[2]);
      const seen = used.get(base) ?? 0;
      used.set(base, seen + 1);
      const id = seen ? `${base}-${seen}` : base;
      const level = heading[1].length;
      out.push(`<h${level} id="${escape(id)}">${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^\s*-{3,}\s*$/.test(line)) {
      flushParagraph();
      closeLists();
      out.push("<hr>");
      continue;
    }

    // A table: a header row, a |---| row, then body rows.
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      flushParagraph();
      closeLists();
      const head = cells(line);
      i++;
      const rows: string[][] = [];
      while (i + 1 < lines.length && /^\s*\|/.test(lines[i + 1])) rows.push(cells(lines[++i]));
      out.push(
        `<div class="table"><table><thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead><tbody>${rows
          .map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`,
      );
      continue;
    }

    // Lists, nested by how far the marker is indented.
    const item = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(line);
    if (item) {
      flushParagraph();
      const indent = item[1].length;
      const kind: "ul" | "ol" = /\d/.test(item[2]) ? "ol" : "ul";
      closeLists(indent);
      const top = lists[lists.length - 1];
      if (top && top.indent === indent && top.kind === kind) out.push("</li><li>");
      else {
        if (top && top.indent === indent) out.push(`</li></${lists.pop()!.kind}>`);
        lists.push({ indent, kind });
        out.push(`<${kind}${kind === "ol" && item[2] !== "1." ? ` start="${parseInt(item[2], 10)}"` : ""}><li>`);
      }
      out.push(inline(item[3]));
      continue;
    }

    // A line under a list item, indented: more of the same item.
    if (lists.length && /^\s+\S/.test(line)) {
      out.push(`<br>${inline(line.trim())}`);
      continue;
    }

    closeLists();
    paragraph.push(line.trim());
  }
  flushParagraph();
  closeLists();
  return out.join("\n");
}
