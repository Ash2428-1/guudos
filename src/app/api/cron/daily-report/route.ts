import { NextResponse } from 'next/server';

/**
 * Scheduled-job template (the pattern Florentin's 10am lateness report used).
 * Vercel Cron calls this with `Authorization: Bearer <CRON_SECRET>`. Concrete
 * jobs (lateness, ops summary) fill in the body and use the admin client +
 * notification adapters.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // TODO(labour): compute lateness for today, email Regional Managers,
  // push to MUMs. Uses createSupabaseAdminClient() + sendEmail()/sendPush().

  return NextResponse.json({ ok: true, ran: 'daily-report' });
}
