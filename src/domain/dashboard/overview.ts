/** Pure aggregation for the Regional Manager overview. No I/O. */

export interface MobileOverview {
  id: string;
  name: string;
  checklistsDue: number;
  checklistsCompleted: number;
  completionPct: number;
  openTickets: number;
}

export interface Overview {
  date: string;
  mobiles: MobileOverview[];
  totals: {
    mobiles: number;
    checklistsDue: number;
    checklistsCompleted: number;
    completionPct: number;
    openTickets: number;
    ticketsOpenedToday: number;
  };
}

export interface OverviewInput {
  date: string;
  mobiles: { id: string; name: string }[];
  /** Active templates each mobile is expected to complete for the day. */
  activeTemplateCount: number;
  instances: { locationId: string; status: string }[];
  tickets: { locationId: string | null; status: string; createdDate: string }[];
}

const pct = (done: number, due: number) =>
  due === 0 ? 0 : Math.round((done / due) * 100);

export function computeOverview(input: OverviewInput): Overview {
  const due = input.activeTemplateCount;

  const mobiles: MobileOverview[] = input.mobiles.map((m) => {
    const completed = input.instances.filter(
      (i) => i.locationId === m.id && i.status === 'completed',
    ).length;
    const openTickets = input.tickets.filter(
      (t) => t.locationId === m.id && t.status !== 'closed',
    ).length;
    return {
      id: m.id,
      name: m.name,
      checklistsDue: due,
      checklistsCompleted: completed,
      completionPct: pct(completed, due),
      openTickets,
    };
  });

  const checklistsDue = due * input.mobiles.length;
  const checklistsCompleted = mobiles.reduce(
    (s, m) => s + m.checklistsCompleted,
    0,
  );

  return {
    date: input.date,
    mobiles,
    totals: {
      mobiles: input.mobiles.length,
      checklistsDue,
      checklistsCompleted,
      completionPct: pct(checklistsCompleted, checklistsDue),
      openTickets: input.tickets.filter((t) => t.status !== 'closed').length,
      ticketsOpenedToday: input.tickets.filter(
        (t) => t.createdDate === input.date,
      ).length,
    },
  };
}
