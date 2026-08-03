import { describe, expect, it } from 'vitest';
import { computeOverview } from '@/domain/dashboard/overview';

describe('computeOverview', () => {
  const base = {
    date: '2026-08-03',
    mobiles: [
      { id: 'm1', name: 'Mobile 01' },
      { id: 'm2', name: 'Mobile 02' },
    ],
    activeTemplateCount: 2,
    instances: [
      { locationId: 'm1', status: 'completed' },
      { locationId: 'm1', status: 'in_progress' },
      { locationId: 'm2', status: 'completed' },
      { locationId: 'm2', status: 'completed' },
    ],
    tickets: [
      { locationId: 'm1', status: 'open', createdDate: '2026-08-03' },
      { locationId: 'm1', status: 'closed', createdDate: '2026-08-01' },
      { locationId: 'm2', status: 'in_progress', createdDate: '2026-08-02' },
    ],
  };

  it('computes per-mobile completion and open tickets', () => {
    const o = computeOverview(base);
    const m1 = o.mobiles.find((m) => m.id === 'm1')!;
    const m2 = o.mobiles.find((m) => m.id === 'm2')!;
    expect(m1.checklistsCompleted).toBe(1);
    expect(m1.completionPct).toBe(50); // 1 of 2 due
    expect(m1.openTickets).toBe(1); // closed one excluded
    expect(m2.completionPct).toBe(100); // 2 of 2
    expect(m2.openTickets).toBe(1);
  });

  it('computes org totals', () => {
    const o = computeOverview(base);
    expect(o.totals.mobiles).toBe(2);
    expect(o.totals.checklistsDue).toBe(4); // 2 templates x 2 mobiles
    expect(o.totals.checklistsCompleted).toBe(3);
    expect(o.totals.completionPct).toBe(75);
    expect(o.totals.openTickets).toBe(2); // 3 tickets, 1 closed
    expect(o.totals.ticketsOpenedToday).toBe(1);
  });

  it('handles no templates without dividing by zero', () => {
    const o = computeOverview({ ...base, activeTemplateCount: 0 });
    expect(o.totals.completionPct).toBe(0);
    expect(o.mobiles[0].completionPct).toBe(0);
  });
});
