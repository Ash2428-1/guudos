import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

/** True once an Anthropic API key is configured. */
export function anthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
export function getAnthropic(): Anthropic | null {
  if (!anthropicConfigured()) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/** Model for document extraction (override via env). Haiku is plenty for
 *  structured field extraction and by far the cheapest per document. */
export const EXTRACTION_MODEL =
  process.env.ANTHROPIC_EXTRACTION_MODEL || 'claude-haiku-4-5-20251001';
