import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client that BYPASSES RLS. Use only in trusted server-side jobs
 * (cron, webhooks, admin provisioning) — never in a user-facing request path.
 * Throws if the secret is missing so misuse fails loudly.
 */
export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
