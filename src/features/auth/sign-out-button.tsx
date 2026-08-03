'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/browser';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await createSupabaseBrowserClient().auth.signOut();
        router.push('/login');
      }}
      className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-60"
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
