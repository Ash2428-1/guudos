import { describe, expect, it } from 'vitest';
import { renderDailyReportEmail } from '@/domain/reports/email';
import { type DailyReportView } from '@/lib/reports';

const row = (over: Partial<DailyReportView>): DailyReportView => ({
  locationId: 'm1',
  locationName: 'Mobile 01',
  date: '2026-08-03',
  hasReport: true,
  serviceMinutes: 510,
  cumulativeBacklog: 9,
  startOfServices: '08:00',
  endOfServices: '16:30',
  firstEnrolledAt: '08:15',
  firstPhcAt: '08:40',
  avgPhcMinutes: 12,
  specsDispensed: 20,
  specsNoStock: 4,
  notes: null,
  ...over,
});

describe('renderDailyReportEmail', () => {
  it('subject and greeting include the date and recipient', () => {
    const { subject, html } = renderDailyReportEmail('Kyle', '2026-08-03', [row({})]);
    expect(subject).toBe('Daily report — 2026-08-03');
    expect(html).toContain('Kyle');
    expect(html).toContain('Mobile 01');
    expect(html).toContain('9'); // cumulative backlog
  });

  it('escapes HTML in mobile names', () => {
    const { html } = renderDailyReportEmail('RM', '2026-08-03', [
      row({ locationName: 'Mobile <script>' }),
    ]);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
