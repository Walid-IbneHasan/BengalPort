import nodemailer from "nodemailer";

export type Mail = { to: string; subject: string; text: string; html: string };
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

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const subjects = { VERIFY_EMAIL:"Verify your Bengal Port email", LOGIN_2FA:"Your Bengal Port login code", RESET_PASSWORD:"Reset your Bengal Port password" } as const;

export async function sendAuthCode(mailer:Mailer,to:string,name:string,code:string,purpose:keyof typeof subjects) {
  if (!mailer.configured) return false;
  await mailer.send({
    to, subject: subjects[purpose],
    text: `Hello ${name}, your Bengal Port verification code is ${code}. It expires in 10 minutes.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#102642"><h2 style="color:#0a1d3a">Bengal Port</h2><p>Hello ${escapeHtml(name)},</p><p>Your verification code is:</p><p style="font-size:30px;font-weight:800;letter-spacing:8px;color:#b98522">${code}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div>`,
  });
  return true;
}
