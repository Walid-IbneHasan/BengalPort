// The one look shared by every email the application sends. Mail apps ignore
// most modern HTML, so this is tables and inline styles, and the logo travels
// inside the message so that it shows even where outside images are blocked.
import { emailLogoPng } from "./email-logo.js";
import type { Mail } from "./email.js";

export type Row = [label: string, value: string];
export type MailContent = {
  heading: string;
  paragraphs: string[];
  // A code, password or figure the reader came for, shown large.
  highlight?: { label: string; value: string };
  details?: Row[];
  // Something a person wrote, shown as a quotation.
  quote?: { label: string; text: string };
  action?: { label: string; url: string };
  note?: string;
};

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const siteUrl = () => (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].trim();

// The mailbox in EMAIL_FROM, which may be written "Bengal Port <info@...>".
const contactAddress = () => {
  const from = (process.env.EMAIL_FROM || process.env.SMTP_USER || "").trim();
  return from.match(/<([^>]+)>/)?.[1] ?? from;
};

const LOGO_ID = "bengal-port-logo@bengalport.com";
const NAVY = "#07182f";
const GOLD = "#c9952d";
const INK = "#33415c";
const MUTED = "#667285";
const LINE = "#e4e8ee";
const PALE = "#f6f7f9";
const SANS = "Arial,Helvetica,sans-serif";
const SERIF = "Georgia,'Times New Roman',Times,serif";
const MONO = "'Courier New',Courier,monospace";

const type = (size: number, height: number, family = SANS) =>
  `font-family:${family};font-size:${size}px;line-height:${height}px;`;
const layoutTable = (style: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${style}">`;
const written = (value: string) => escapeHtml(value).replace(/\n/g, "<br>");
const caption = (value: string, color = MUTED) =>
  `<div style="${type(11, 16)}font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${color};">${written(value)}</div>`;

const paragraph = (value: string) => `<p style="margin:0 0 16px;${type(15, 24)}color:${INK};">${written(value)}</p>`;

function highlightBlock({ label, value }: NonNullable<MailContent["highlight"]>) {
  const short = value.length <= 10;
  return `${layoutTable("margin:8px 0 24px;")}<tr><td align="center" bgcolor="#fbf6ea" style="background:#fbf6ea;border:1px solid #ecdcb6;border-radius:8px;padding:20px 12px;">${caption(label, "#7a5a16")}<div style="margin-top:8px;${type(short ? 30 : 20, short ? 38 : 28, MONO)}font-weight:700;letter-spacing:${short ? 5 : 1}px;color:${NAVY};">${written(value)}</div></td></tr></table>`;
}

function detailsBlock(rows: Row[]) {
  const cell = "padding:10px 0;border-bottom:1px solid " + LINE + ";";
  return `${layoutTable(`margin:4px 0 24px;border-top:1px solid ${LINE};`)}${rows
    .map(([label, value]) => `<tr><td width="32%" valign="top" style="${cell}padding-right:12px;${type(13, 20)}color:${MUTED};">${written(label)}</td><td valign="top" style="${cell}${type(14, 20)}font-weight:700;color:${NAVY};">${written(value)}</td></tr>`)
    .join("")}</table>`;
}

function quoteBlock({ label, text }: NonNullable<MailContent["quote"]>) {
  return `${layoutTable("margin:4px 0 24px;")}<tr><td bgcolor="${PALE}" style="background:${PALE};border-left:3px solid ${GOLD};padding:14px 16px;">${caption(label)}<div style="margin-top:6px;${type(14, 22)}color:${INK};">${written(text)}</div></td></tr></table>`;
}

function actionBlock({ label, url }: NonNullable<MailContent["action"]>) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td bgcolor="${GOLD}" style="background:${GOLD};border-radius:6px;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 28px;${type(15, 20)}font-weight:700;color:${NAVY};text-decoration:none;border-radius:6px;">${written(label)}</a></td></tr></table>`;
}

const noteBlock = (value: string) =>
  `<p style="margin:0;padding-top:18px;border-top:1px solid ${LINE};${type(13, 20)}color:${MUTED};">${written(value)}</p>`;

function page(subject: string, content: MailContent) {
  const site = siteUrl();
  const contact = contactAddress();
  // What a mail app shows beside the subject in the inbox.
  const preview = (content.paragraphs.find((p) => !/^Hello\b/.test(p)) ?? content.heading).replace(/\s+/g, " ").slice(0, 140);
  const link = `color:${MUTED};text-decoration:underline;`;
  const contactLinks = [
    `<a href="${escapeHtml(site)}" style="${link}">${escapeHtml(site.replace(/^https?:\/\//, ""))}</a>`,
    ...(contact ? [`<a href="mailto:${escapeHtml(contact)}" style="${link}">${escapeHtml(contact)}</a>`] : []),
  ].join(" &nbsp;&middot;&nbsp; ");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#eef1f5;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
${layoutTable("background:#eef1f5;")}<tr><td align="center" bgcolor="#eef1f5" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;">
<tr><td bgcolor="${NAVY}" style="background:${NAVY};padding:22px 32px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="padding-right:14px;"><img src="cid:${LOGO_ID}" width="64" height="64" alt="Bengal Port" style="display:block;width:64px;height:64px;border:0;"></td>
<td valign="middle"><div style="${type(20, 26, SERIF)}font-weight:700;letter-spacing:2px;color:#ffffff;">BENGAL PORT</div><div style="${type(12, 18)}color:#e0b558;">Connecting Bengal to the World</div></td>
</tr></table></td></tr>
<tr><td height="3" bgcolor="${GOLD}" style="height:3px;background:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:32px;word-break:break-word;">
<h1 style="margin:0 0 18px;${type(24, 32, SERIF)}font-weight:700;color:${NAVY};">${written(content.heading)}</h1>
${content.paragraphs.map(paragraph).join("\n")}
${content.highlight ? highlightBlock(content.highlight) : ""}${content.details?.length ? detailsBlock(content.details) : ""}${content.quote ? quoteBlock(content.quote) : ""}${content.action ? actionBlock(content.action) : ""}${content.note ? noteBlock(content.note) : ""}
</td></tr>
<tr><td align="center" bgcolor="${PALE}" style="background:${PALE};border-top:1px solid ${LINE};padding:20px 32px;${type(12, 20)}color:${MUTED};"><strong style="color:${NAVY};">Bengal Port</strong><br>${contactLinks}<br>&copy; ${new Date().getFullYear()} Bengal Port. All rights reserved.</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function plainText(content: MailContent) {
  const { paragraphs, highlight, details, quote, action, note } = content;
  return [
    ...paragraphs,
    highlight && `${highlight.label}: ${highlight.value}`,
    details?.length ? details.map(([label, value]) => `${label}: ${value}`).join("\n") : "",
    quote && `${quote.label}:\n${quote.text}`,
    action && `${action.label}: ${action.url}`,
    note,
    `Bengal Port\n${siteUrl()}`,
  ].filter(Boolean).join("\n\n");
}

export function brandedMail(to: string, subject: string, content: MailContent): Mail {
  return {
    to,
    subject,
    text: plainText(content),
    html: page(subject, content),
    attachments: [{ filename: "bengal-port-logo.png", content: emailLogoPng, cid: LOGO_ID, contentType: "image/png", contentDisposition: "inline" }],
  };
}
