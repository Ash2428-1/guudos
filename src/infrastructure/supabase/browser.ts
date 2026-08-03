import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for use inside client components. Safe to import from the
 * browser bundle — only public (anon) credentials are referenced.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
