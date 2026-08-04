import 'server-only';
import { createSupabaseAdminClient } from '@/infrastructure/supabase/admin';
import { sendEmail } from '@/infrastructure/notifications/email';
import { renderDailyReportEmail } from '@/domain/reports/email';
import { loadReportViews, localDay } from '@/services/reports/service';

export interface SendResult {
  date: string;
  sent: number;
  skipped: number;
  recipients: Array<{ email: string; mobiles: number; ok: boolean; reason?: string }>;
}

/**
 * Email each Regional Manager (their region's mobiles) and owner (all mobiles)
 * the previous day's report-back. Runs outside any user session, so it uses the
 * service-role client. Degrades to skipped rows when email isn't configured.
 */
export async function sendDailyReportEmails(dateOverride?: string): Promise<SendResult> {
  const admin = createSupabaseAdminClient();
  const day = dateOverride ?? localDay(-1);

  const [{ data: mems }, { data: locs }] = await Promise.all([
    admin
      .from('memberships')
      .select('role, region_id, organization_id, profiles(email, full_name)')
      .in('role', ['manager', 'owner']),
    admin
      .from('locations')
      .select('id, name, region_id, organization_id')
      .eq('is_active', true),
  ]);

  const locations = (locs ?? []) as Array<{
    id: string;
    name: string;
    region_id: string;
    organization_id: string;
  }>;

  const rows = (mems ?? []) as Array<{
    role: string;
    region_id: string | null;
    organization_id: string;
    profiles:
      | { email: string | null; full_name: string | null }
      | Array<{ email: string | null; full_name: string | null }>
      | null;
  }>;

  const result: SendResult = { date: day, sent: 0, skipped: 0, recipients: [] };

  for (const m of rows) {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    const email = profile?.email ?? null;
    const name = profile?.full_name ?? 'there';

    const mobiles =
      m.role === 'owner'
        ? locations.filter((l) => l.organization_id === m.organization_id)
        : locations.filter((l) => l.region_id === m.region_id);

    if (!email || mobiles.length === 0) {
      result.skipped++;
      result.recipients.push({
        email: email ?? '(no email)',
        mobiles: mobiles.length,
        ok: false,
        reason: !email ? 'no email' : 'no mobiles',
      });
      continue;
    }

    const views = await loadReportViews(
      admin,
      mobiles.map((x) => ({ id: x.id, name: x.name })),
      day,
    );
    const { subject, html } = renderDailyReportEmail(name, day, views);
    const ok = await sendEmail({ to: email, subject, html });
    if (ok) result.sent++;
    else result.skipped++;
    result.recipients.push({ email, mobiles: mobiles.length, ok, reason: ok ? undefined : 'send failed / not configured' });
  }

  return result;
}
