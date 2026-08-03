import { requireSession } from '@/services/auth/session';
import { HomeTiles } from '@/features/home/home-tiles';
import { type Capability, ROLE_LABELS } from '@/lib/roles';

export default async function HomePage() {
  const ctx = await requireSession();
  const firstName = ctx.fullName?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hi {firstName}</h1>
        <p className="text-sm text-muted-foreground">
          {ROLE_LABELS[ctx.role]} · your Guud OS
        </p>
      </div>
      <HomeTiles
        role={ctx.role}
        capabilities={[...ctx.capabilities] as Capability[]}
      />
    </div>
  );
}
