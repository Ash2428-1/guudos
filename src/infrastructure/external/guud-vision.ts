import 'server-only';
import { ExternalApiClient } from './client';

/** True once the Guud Vision dashboard base URL + API key are configured. */
export function guudVisionConfigured(): boolean {
  return Boolean(
    process.env.GUUD_VISION_BASE_URL && process.env.GUUD_VISION_API_KEY,
  );
}

export interface VisionDaily {
  locationCode: string;
  date: string;
  cut: number;
  notCut: number;
}

/**
 * Client for dashboard.guudvision.health. Returns null until configured.
 * NOTE: endpoint + response shape are placeholders — confirm against the real
 * API, then a cron job can upsert vision_entries from `fetchDaily()`.
 */
export class GuudVisionClient extends ExternalApiClient {
  constructor() {
    super({
      name: 'guud-vision',
      baseUrl: process.env.GUUD_VISION_BASE_URL!.replace(/\/$/, ''),
      headers: { Authorization: `Bearer ${process.env.GUUD_VISION_API_KEY}` },
    });
  }

  // TODO: verify real endpoint + shape for the Guud Vision dashboard.
  async fetchDaily(date: string): Promise<VisionDaily[]> {
    return this.request<VisionDaily[]>(`/api/specs?date=${encodeURIComponent(date)}`);
  }
}

export function createGuudVisionClient(): GuudVisionClient | null {
  return guudVisionConfigured() ? new GuudVisionClient() : null;
}
