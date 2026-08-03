import 'server-only';
import { Resend } from 'resend';

let client: Resend | null = null;
function resend(): Resend | null {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  client = new Resend(key);
  return client;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email via Resend. Returns false (and warns) when unconfigured rather
 * than throwing, so callers in cron/report paths degrade gracefully.
 */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const r = resend();
  if (!r) {
    console.warn('[email] RESEND_API_KEY not set — skipping send');
    return false;
  }
  const from = msg.from ?? process.env.RESEND_FROM ?? 'Guud OS <ops@guudapp.co>';
  const { error } = await r.emails.send({
    from,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
  });
  if (error) {
    console.error('[email] send failed', error);
    return false;
  }
  return true;
}
