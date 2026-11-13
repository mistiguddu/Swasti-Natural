import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transport = null;

/** True when SMTP is configured in .env. */
export const mailEnabled = Boolean(env.smtp);

/** Sends an email via SMTP. Returns false (and logs in development) when SMTP is not configured. */
export async function sendMail({ to, subject, text, html }) {
  if (!env.smtp) {
    if (env.nodeEnv !== 'production') console.log(`[mail disabled] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return false;
  }
  transport ??= nodemailer.createTransport({ host: env.smtp.host, port: env.smtp.port, secure: env.smtp.secure, auth: env.smtp.auth });
  await transport.sendMail({ from: env.smtp.from, to, subject, text, html });
  return true;
}
