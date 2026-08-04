import { NextResponse } from 'next/server';
import { sendDailyReportEmails } from '@/services/reports/daily-email';

/**
 * Daily report-back email. Vercel Cron calls this each morning with
 * `Authorization: Bearer <CRON_SECRET>` (Vercel injects it automatically when
 * CRON_SECRET is set). Emails each RM their region's previous-day report.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await sendDailyReportEmails();
  return NextResponse.json({ ok: true, ...result });
}
