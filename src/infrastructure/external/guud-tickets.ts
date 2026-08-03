import 'server-only';
import { ExternalApiClient } from './client';

export interface GuudTicketPayload {
  title: string;
  description?: string;
  /** Our internal ticket id, for cross-referencing. */
  reference?: string;
}

/** True once the ticket-system base URL + API key are set in the environment. */
export function guudTicketsConfigured(): boolean {
  return Boolean(
    process.env.GUUD_TICKETS_BASE_URL && process.env.GUUD_TICKETS_API_KEY,
  );
}

/**
 * Client for tickets.driving.guudapp.co. Returns null until configured so the
 * app degrades gracefully. NOTE: the endpoint path + payload shape are a
 * placeholder — confirm against the real API, then adjust `create()`.
 */
export class GuudTicketsClient extends ExternalApiClient {
  constructor() {
    super({
      name: 'guud-tickets',
      baseUrl: process.env.GUUD_TICKETS_BASE_URL!.replace(/\/$/, ''),
      headers: { Authorization: `Bearer ${process.env.GUUD_TICKETS_API_KEY}` },
    });
  }

  // TODO: verify real endpoint + response shape for the Guud ticket system.
  async create(payload: GuudTicketPayload): Promise<{ id: string }> {
    return this.request<{ id: string }>('/api/administration/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export function createGuudTicketsClient(): GuudTicketsClient | null {
  return guudTicketsConfigured() ? new GuudTicketsClient() : null;
}
