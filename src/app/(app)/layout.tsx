import { type ReactNode } from 'react';
import { requireSession } from '@/services/auth/session';
import { AppShell } from '@/features/shell/app-shell';
import { type Capability } from '@/lib/roles';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await requireSession();
  return (
    <AppShell
      role={ctx.role}
      capabilities={[...ctx.capabilities] as Capability[]}
      fullName={ctx.fullName}
    >
      {children}
    </AppShell>
  );
}
