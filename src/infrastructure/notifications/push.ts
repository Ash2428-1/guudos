import 'server-only';
import webpush, { type PushSubscription } from 'web-push';

let configured: boolean | null = null;
function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:ops@guudapp.co';
  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Send a web-push notification to one subscription. Returns false when VAPID is
 * unconfigured or the endpoint is gone (410/404 — caller should prune the sub).
 */
export async function sendPush(
  subscription: PushSubscription,
  payload: PushPayload,
): Promise<boolean> {
  if (!ensureConfigured()) {
    console.warn('[push] VAPID keys not set — skipping send');
    return false;
  }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error('[push] send failed', err);
    return false;
  }
}
