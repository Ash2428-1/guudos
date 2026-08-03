import { type TicketStatus } from '@/lib/tickets';

/** Which statuses a ticket can move to from its current one. */
export function nextStatuses(current: TicketStatus): TicketStatus[] {
  switch (current) {
    case 'open':
      return ['in_progress', 'closed'];
    case 'in_progress':
      return ['closed'];
    case 'closed':
      return ['open']; // reopen
  }
}

/** Open = anything not closed (drives "active work" counts). */
export function isOpen(status: TicketStatus): boolean {
  return status !== 'closed';
}

/** Guard for untrusted status strings coming from the DB/UI. */
export function isTicketStatus(v: string): v is TicketStatus {
  return v === 'open' || v === 'in_progress' || v === 'closed';
}
