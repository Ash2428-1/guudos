/** Client-safe ticket types shared by domain, services and UI. */

export type TicketStatus = 'open' | 'in_progress' | 'closed';
export type TicketSource = 'checklist' | 'manual';

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  closed: 'Closed',
};

export const TICKET_STATUS_ORDER: TicketStatus[] = ['open', 'in_progress', 'closed'];

export const TICKET_SOURCE_LABELS: Record<TicketSource, string> = {
  checklist: 'Checklist',
  manual: 'Manual',
};
