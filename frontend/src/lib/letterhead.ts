// Bengal Port's own letterhead, as a drawing: a navy and gold sweep at the
// top left, the emblem and name, the contact details beside a faint map of
// the world, the emblem again as a watermark, and a thin sweep at the foot.
// It is A4 in shape (2100 × 2970, a tenth of a millimetre each) and its
// heading ends 56 mm down. It is made into a picture (with its own font and
// logo inside) because browsers print a picture on every page reliably,
// where a drawing placed on the page loses parts of itself after page one.
import dots from "./world-dots.json";

export type LetterheadDetails = {
  // data: URLs, so the picture needs nothing from outside itself.
  logo: string;
  font: string;
  name: string;
  subtitle: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
};

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// An address longer than a line is broken after the comma nearest its middle.
export function addressLines(address: string): string[] {
  const text = address.trim();
  if (text.length <= 30) return text ? [text] : [];
  const middle = Math.floor(text.length / 2);
  const commas = [...text.matchAll(/,/g)].map((match) => match.index!);
  const cut = commas.length
    ? commas.reduce((best, at) => (Math.abs(at - middle) < Math.abs(best - middle) ? at : best))
    : text.lastIndexOf(" ", middle);
  return cut > 0 ? [text.slice(0, cut + 1).trim(), text.slice(cut + 1).trim()] : [text];
}

const icons: Record<string, string> = {
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  phone:
    '<path d="M21 16.4v2.8a1.9 1.9 0 0 1-2.1 1.9A18.8 18.8 0 0 1 2.9 5.1 1.9 1.9 0 0 1 4.8 3h2.8a1.9 1.9 0 0 1 1.9 1.6c.1.9.4 1.8.7 2.7a1.9 1.9 0 0 1-.4 2L8.6 10.5a15.2 15.2 0 0 0 4.9 4.9l1.2-1.2a1.9 1.9 0 0 1 2-.4c.9.3 1.8.6 2.7.7a1.9 1.9 0 0 1 1.6 1.9z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 3.6 9A14 14 0 0 1 12 21a14 14 0 0 1-3.6-9A14 14 0 0 1 12 3z"/>',
};

// The world from the Business page's map, in the top right corner.
const world = (dots as number[][])
  .map(([x, y]) => `<circle cx="${(1180 + (x - 13) * 2.72).toFixed(1)}" cy="${(30 + (y - 18) * 2.72).toFixed(1)}" r="2.9"/>`)
  .join("");

export function letterheadSvg(details: LetterheadDetails): string {
  const { logo, font, name, subtitle, tagline } = details;
  // The name fills the space before the contact column, whatever its length.
  const nameSize = Math.min(104, Math.round(740 / Math.max(1, name.length * (name === name.toUpperCase() ? 0.72 : 0.6))));
  const subtitleSize = Math.min(36, Math.round(740 / Math.max(1, subtitle.length * 0.53)));
  const rows = [
    { icon: "pin", lines: addressLines(details.address) },
    { icon: "phone", lines: [details.phone.trim()] },
    { icon: "mail", lines: [details.email.trim()] },
    { icon: "globe", lines: [details.website.trim()] },
  ].filter((row) => row.lines.join("").trim());
  let y = rows.length > 3 && rows[0].lines.length > 1 ? 168 : 190;
  const contacts = rows
    .map((row) => {
      const text = row.lines
        .map((line, n) => `<text x="84" y="${row.lines.length > 1 ? 24 + n * 40 : 42}" class="contact">${escape(line)}</text>`)
        .join("");
      const out = `<g class="row" transform="translate(1378 ${y})"><circle cx="30" cy="30" r="30" fill="#0f2747"/><g transform="translate(13 13) scale(1.42)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[row.icon]}</g>${text}</g>`;
      y += row.lines.length > 1 ? 106 : 74;
      return out;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2100 2970" width="2100" height="2970">
<defs>
<style>${font ? `@font-face{font-family:"BP Letterhead";font-weight:200 800;src:url("${font}") format("woff2")}` : ""}
text{font-family:"BP Letterhead","Manrope Variable",Manrope,"Segoe UI",Arial,sans-serif}
.name{font-weight:800;letter-spacing:-1px;fill:#07182f}.subtitle{font-weight:600;fill:#1f4470}
.tagline{font-size:24px;font-weight:800;letter-spacing:4px;fill:#a87618}.contact{font-size:33px;font-weight:650;fill:#0f2747}</style>
<linearGradient id="navy" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0" stop-color="#07182f"/><stop offset="1" stop-color="#17345a"/></linearGradient>
<linearGradient id="gold" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#a87618"/><stop offset="0.5" stop-color="#e2b753"/><stop offset="1" stop-color="#c79836"/></linearGradient>
<radialGradient id="fade" cx="0.82" cy="0.18" r="0.62"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<mask id="map"><rect x="1100" y="0" width="1000" height="620" fill="url(#fade)"/></mask>
<clipPath id="seal"><circle cx="315" cy="330" r="152"/></clipPath>
<clipPath id="mark"><circle cx="1050" cy="1600" r="610"/></clipPath>
</defs>
<path d="M0 0H1260C930 34 520 112 0 372Z" fill="url(#navy)"/>
<path d="M0 372C520 112 930 34 1260 0H1352C990 62 560 158 0 438Z" fill="url(#gold)"/>
<path d="M0 438C560 158 990 62 1352 0H1384C1010 74 580 176 0 462Z" fill="#17345a" opacity="0.18"/>
<g mask="url(#map)" fill="#8db6dd" opacity="0.85">${world}</g>
<circle cx="315" cy="330" r="160" fill="#fff"/>
${logo ? `<image href="${logo}" x="163" y="178" width="304" height="304" clip-path="url(#seal)" preserveAspectRatio="xMidYMid slice"/>` : ""}
<circle cx="315" cy="330" r="156" fill="none" stroke="#c79836" stroke-width="5"/>
<text x="530" y="300" class="name" font-size="${nameSize}">${escape(name)}</text>
<text x="532" y="364" class="subtitle" font-size="${subtitleSize}">${escape(subtitle)}</text>
<line x1="532" y1="420" x2="600" y2="420" stroke="#c79836" stroke-width="4"/>
<text x="616" y="432" class="tagline">${escape(tagline.toUpperCase())}</text>
<line x1="1336" y1="170" x2="1336" y2="490" stroke="#17345a" stroke-width="4" opacity="0.85"/>
${contacts}
${logo ? `<image href="${logo}" x="440" y="990" width="1220" height="1220" clip-path="url(#mark)" opacity="0.055" preserveAspectRatio="xMidYMid slice"/>` : ""}
<path d="M2100 2970H1180C1500 2948 1820 2905 2100 2836Z" fill="url(#navy)"/>
<path d="M2100 2836C1820 2905 1500 2948 1180 2970H1110C1460 2938 1800 2884 2100 2800Z" fill="url(#gold)"/>
<line x1="160" y1="2930" x2="1060" y2="2930" stroke="#c79836" stroke-width="3" opacity="0.7"/>
</svg>`;
}

// Reads a file into a data: URL, or "" when it cannot be had.
export async function dataUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) return "";
    const blob = await response.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}
