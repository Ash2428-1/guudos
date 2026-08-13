import 'server-only';
import { ExternalApiClient } from './client';

/** True once the Metabase base URL + API key are configured. */
export function metabaseConfigured(): boolean {
  return Boolean(process.env.METABASE_BASE_URL && process.env.METABASE_API_KEY);
}

export interface CardResult {
  id: number;
  name: string;
  columns: string[];
  rows: Array<Array<string | number | null>>;
}

/**
 * Client for Metabase (analytics.guudapp.co). Runs saved questions ("cards")
 * and returns their columns + rows. Auth via API key (Metabase v0.49+).
 * Returns null until configured so the Assessments page degrades gracefully.
 */
export class MetabaseClient extends ExternalApiClient {
  constructor() {
    super({
      name: 'metabase',
      baseUrl: process.env.METABASE_BASE_URL!.replace(/\/$/, ''),
      headers: { 'x-api-key': process.env.METABASE_API_KEY! },
    });
  }

  async card(id: number): Promise<CardResult> {
    const meta = await this.request<{ name: string }>(`/api/card/${id}`);
    const res = await this.request<{
      data: {
        cols: Array<{ display_name?: string; name: string }>;
        rows: Array<Array<string | number | null>>;
      };
    }>(`/api/card/${id}/query`, { method: 'POST', body: JSON.stringify({}) });
    return {
      id,
      name: meta.name ?? `Card ${id}`,
      columns: res.data.cols.map((c) => c.display_name ?? c.name),
      rows: res.data.rows,
    };
  }
}

export function createMetabaseClient(): MetabaseClient | null {
  return metabaseConfigured() ? new MetabaseClient() : null;
}
