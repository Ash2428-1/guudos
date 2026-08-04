import { type DailyReportView } from '@/lib/reports';

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

const cell = (v: string | number | null) =>
  v === null || v === '' ? '—' : esc(String(v));

function duration(mins: number | null): string {
  if (mins === null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

const TD = 'padding:6px 8px;border-bottom:1px solid #eee;font-size:13px;';
const TH = 'padding:6px 8px;text-align:left;font-size:11px;color:#666;text-transform:uppercase;';

/** Render one recipient's daily report-back email. Pure (no I/O). */
export function renderDailyReportEmail(
  recipientName: string,
  date: string,
  rows: DailyReportView[],
): { subject: string; html: string } {
  const body = rows
    .map(
      (r) => `<tr>
      <td style="${TD}font-weight:600;">${esc(r.locationName)}</td>
      <td style="${TD}">${cell(r.startOfServices)}</td>
      <td style="${TD}">${cell(r.endOfServices)}</td>
      <td style="${TD}">${duration(r.serviceMinutes)}</td>
      <td style="${TD}">${cell(r.firstEnrolledAt)}</td>
      <td style="${TD}">${cell(r.firstPhcAt)}</td>
      <td style="${TD}">${r.avgPhcMinutes === null ? '—' : `${r.avgPhcMinutes}m`}</td>
      <td style="${TD}">${cell(r.specsDispensed)}</td>
      <td style="${TD}">${cell(r.specsNoStock)}</td>
      <td style="${TD}font-weight:600;">${r.cumulativeBacklog}</td>
    </tr>`,
    )
    .join('');

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:900px;">
    <h2 style="margin:0 0 4px;">Daily report — ${esc(date)}</h2>
    <p style="margin:0 0 16px;color:#555;">Morning ${esc(recipientName)}, here's yesterday across your mobiles.</p>
    <table style="border-collapse:collapse;width:100%;">
      <thead><tr>
        <th style="${TH}">Mobile</th><th style="${TH}">Start</th><th style="${TH}">End</th>
        <th style="${TH}">Service</th><th style="${TH}">1st enrol</th><th style="${TH}">1st PHC</th>
        <th style="${TH}">Avg PHC</th><th style="${TH}">Specs</th><th style="${TH}">No stock</th>
        <th style="${TH}">Backlog</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>
    <p style="margin:16px 0 0;font-size:11px;color:#999;">Avg PHC (Goodx) and Specs (iTrust) show once those integrations are live.</p>
  </div>`;

  return { subject: `Daily report — ${date}`, html };
}
