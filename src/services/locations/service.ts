import 'server-only';
import { requireSession } from '@/services/auth/session';
import { createSupabaseServerClient } from '@/infrastructure/supabase/server';

export interface MobileOption {
  id: string;
  name: string;
}

/** Active mobiles the current user can access (RLS-scoped). */
export async function listAccessibleMobiles(): Promise<MobileOption[]> {
  const ctx = await requireSession();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('locations')
    .select('id, name')
    .eq('organization_id', ctx.organizationId)
    .eq('is_active', true)
    .order('name');
  return (data ?? []) as MobileOption[];
}
