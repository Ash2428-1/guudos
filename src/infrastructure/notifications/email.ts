import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

/**
 * Provider-agnostic SMTP transport. Works with Brevo, SendGrid, Resend SMTP,
 * etc. Configured entirely via env so switching providers is a config change,
 * not a code change. Returns null (and callers skip) when unconfigured.
 *
 *   SMTP_HOST=smtp-relay.brevo.com
 *   SMTP_PORT=587
 *   SMTP_USER=<login>
 *   SMTP_PASS=<smtp key>
 *   EMAIL_FROM="Guud OS <ops@guudapp.co>"
 */
function getTransport(): Transporter | null {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT ?? '587');
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user, pass },
  });
  return transporter;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email over SMTP. Returns false (and warns) when unconfigured rather
 * than throwing, so cron/report paths degrade gracefully.
 */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const t = getTransport();
  if (!t) {
    console.warn('[email] SMTP not configured — skipping send');
    return false;
  }
  const from = msg.from ?? process.env.EMAIL_FROM ?? 'Guud OS <ops@guudapp.co>';
  try {
    await t.sendMail({ from, to: msg.to, subject: msg.subject, html: msg.html });
    return true;
  } catch (error) {
    console.error('[email] send failed', error);
    return false;
  }
}
