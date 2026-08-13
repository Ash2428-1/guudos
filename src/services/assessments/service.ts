import 'server-only';
import { requireCapability } from '@/services/auth/session';
import {
  createMetabaseClient,
  metabaseConfigured,
  type CardResult,
} from '@/infrastructure/external/metabase';

export interface AssessmentsResult {
  configured: boolean;
  cards: CardResult[];
  note?: string;
}

/**
 * Assessment trackers from Metabase saved questions. Card IDs come from
 * METABASE_ASSESSMENT_CARD_IDS (comma-separated). Degrades gracefully when
 * Metabase isn't configured yet.
 */
export async function getAssessments(): Promise<AssessmentsResult> {
  await requireCapability('view_assessments');
  if (!metabaseConfigured()) return { configured: false, cards: [] };

  const ids = (process.env.METABASE_ASSESSMENT_CARD_IDS ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (ids.length === 0) {
    return {
      configured: true,
      cards: [],
      note: 'Connected to Metabase, but no card IDs set (METABASE_ASSESSMENT_CARD_IDS).',
    };
  }

  const client = createMetabaseClient()!;
  const cards: CardResult[] = [];
  for (const id of ids) {
    try {
      cards.push(await client.card(id));
    } catch (e) {
      cards.push({
        id,
        name: `Card ${id}`,
        columns: ['Error'],
        rows: [[e instanceof Error ? e.message : 'Failed to load']],
      });
    }
  }
  return { configured: true, cards };
}
