import nodemailer from "nodemailer";

const configured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const transport = configured ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
}) : null;
const subjects = { VERIFY_EMAIL:"Verify your Bengal Port email", LOGIN_2FA:"Your Bengal Port login code", RESET_PASSWORD:"Reset your Bengal Port password" } as const;

export async function sendAuthCode(to:string,name:string,code:string,purpose:keyof typeof subjects) {
  if (!transport) return false;
  await transport.sendMail({
    from: process.env.EMAIL_FROM || `Bengal Port <${process.env.SMTP_USER}>`, to, subject: subjects[purpose],
    text: `Hello ${name}, your Bengal Port verification code is ${code}. It expires in 10 minutes.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#102642"><h2 style="color:#0a1d3a">Bengal Port</h2><p>Hello ${name},</p><p>Your verification code is:</p><p style="font-size:30px;font-weight:800;letter-spacing:8px;color:#b98522">${code}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div>`,
  });
  return true;
}
