import nodemailer from "nodemailer";
import { brandedMail, siteUrl } from "./email-layout.js";

export { brandedMail, escapeHtml, siteUrl } from "./email-layout.js";

export type MailAttachment = { filename: string; content: Buffer; cid: string; contentType: string; contentDisposition: "inline" };
export type Mail = { to: string; subject: string; text: string; html: string; attachments?: MailAttachment[] };
export type Mailer = { configured: boolean; send(mail: Mail): Promise<void> };

// Connection settings for the mail server, or null when email is not set up.
// Login is either a password (for Gmail, an app password) or Google OAuth
// keys: SMTP_OAUTH_CLIENT_ID, SMTP_OAUTH_CLIENT_SECRET, SMTP_OAUTH_REFRESH_TOKEN.
export function smtpOptions(env: NodeJS.ProcessEnv = process.env) {
  const { SMTP_HOST: host, SMTP_USER: user } = env;
  if (!host || !user) return null;
  const oauth = env.SMTP_OAUTH_CLIENT_ID && env.SMTP_OAUTH_CLIENT_SECRET && env.SMTP_OAUTH_REFRESH_TOKEN
    ? { type: "OAuth2" as const, user, clientId: env.SMTP_OAUTH_CLIENT_ID, clientSecret: env.SMTP_OAUTH_CLIENT_SECRET, refreshToken: env.SMTP_OAUTH_REFRESH_TOKEN }
    : null;
  if (!oauth && !env.SMTP_PASS) return null;
  const port = Number(env.SMTP_PORT || 587);
  return {
    host,
    port,
    secure: env.SMTP_SECURE === "true" || port === 465,
    auth: oauth ?? { user, pass: env.SMTP_PASS as string },
  };
}

export function createMailer(env: NodeJS.ProcessEnv = process.env): Mailer {
  const options = smtpOptions(env);
  const transport = options ? nodemailer.createTransport(options) : null;
  const from = env.EMAIL_FROM || `Bengal Port <${env.SMTP_USER}>`;
  return {
    configured: Boolean(transport),
    async send(mail) {
      if (transport) await transport.sendMail({ from, ...mail });
    },
  };
}

const codeEmails = {
  VERIFY_EMAIL: { subject: "Verify your Bengal Port email", heading: "Verify your email", intro: "Use this code to finish setting up your Bengal Port account.", label: "Verification code" },
  LOGIN_2FA: { subject: "Your Bengal Port login code", heading: "Your sign-in code", intro: "Use this code to finish signing in to Bengal Port.", label: "Sign-in code" },
  RESET_PASSWORD: { subject: "Reset your Bengal Port password", heading: "Reset your password", intro: "Use this code to choose a new password for your Bengal Port account.", label: "Reset code" },
} as const;

export async function sendAuthCode(mailer: Mailer, to: string, code: string, purpose: keyof typeof codeEmails) {
  if (!mailer.configured) return false;
  const { subject, heading, intro, label } = codeEmails[purpose];
  await mailer.send(brandedMail(to, subject, {
    heading,
    paragraphs: [intro],
    highlight: { label, value: code },
    note: "This code expires in 10 minutes. If you did not request it, you can ignore this email.",
  }));
  return true;
}

// An administrator has made this person an account. They sign in once with
// this password and are then required to choose their own.
export async function sendAccountCreated(mailer: Mailer, account: { to: string; name: string; password: string }) {
  if (!mailer.configured) return false;
  await mailer.send(brandedMail(account.to, "Your Bengal Port account is ready", {
    heading: "Welcome to Bengal Port",
    paragraphs: [`Hello ${account.name},`, "An account has been created for you on Bengal Port. Sign in with this email address and the temporary password below."],
    highlight: { label: "Temporary password", value: account.password },
    details: [["Email", account.to]],
    action: { label: "Sign in", url: `${siteUrl()}/login` },
    note: "You will be asked to choose a new password when you first sign in. Please do not share this email with anyone.",
  }));
  return true;
}
