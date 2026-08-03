import 'server-only';

/**
 * Base client for Guud's external systems. Generalises the integration playbook
 * proven on Florentin's GAAP link:
 *   - typed client reading creds from env
 *   - match=[("field","op","value")]-style filters
 *   - {totalRecords, data} response envelope
 *   - live smoke-tests before building UI
 *
 * Concrete clients (schedules / tickets / Metabase / Vision / Unleashed) extend
 * this and add endpoint-specific methods.
 */

export type MatchOp = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';
export type Match = [field: string, op: MatchOp, value: string | number];

export interface Envelope<T> {
  totalRecords: number;
  data: T[];
}

export interface ExternalClientConfig {
  /** Base URL, no trailing slash. */
  baseUrl: string;
  /** Static headers (auth token, api key, etc.). */
  headers?: Record<string, string>;
  /** Per-request timeout, ms. */
  timeoutMs?: number;
  /** Label used in logs / errors. */
  name: string;
}

export class ExternalApiError extends Error {
  constructor(
    public readonly client: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`[${client}] ${status}: ${body.slice(0, 200)}`);
    this.name = 'ExternalApiError';
  }
}

export class ExternalApiClient {
  constructor(protected readonly config: ExternalClientConfig) {}

  protected buildQuery(matches?: Match[], extra?: Record<string, string>): string {
    const params = new URLSearchParams(extra);
    // Encode match filters as match=field:op:value (adjust per concrete API).
    for (const [field, op, value] of matches ?? []) {
      params.append('match', `${field}:${op}:${value}`);
    }
    const q = params.toString();
    return q ? `?${q}` : '';
  }

  protected async request<T>(
    path: string,
    init?: RequestInit & { query?: string },
  ): Promise<T> {
    const { query, ...rest } = init ?? {};
    const url = `${this.config.baseUrl}${path}${query ?? ''}`;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs ?? 15_000,
    );
    try {
      const res = await fetch(url, {
        ...rest,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...this.config.headers,
          ...rest.headers,
        },
      });
      const text = await res.text();
      if (!res.ok) {
        throw new ExternalApiError(this.config.name, res.status, text);
      }
      return (text ? JSON.parse(text) : null) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** GET returning the {totalRecords, data} envelope. */
  protected getEnvelope<T>(path: string, matches?: Match[]): Promise<Envelope<T>> {
    return this.request<Envelope<T>>(path, { query: this.buildQuery(matches) });
  }
}

/** Read a required env var, throwing a clear error if missing. */
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
