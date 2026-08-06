import { requireSession } from '@/services/auth/session';
import { ROLE_LABELS } from '@/lib/roles';
import { PasswordForm } from '@/features/auth/password-form';
import { SignOutButton } from '@/features/auth/sign-out-button';

export default async function AccountPage() {
  const ctx = await requireSession();

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">{ROLE_LABELS[ctx.role]}</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 text-sm">
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">Name</span>
          <span className="font-medium">{ctx.fullName ?? '—'}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">Email</span>
          <span className="font-medium">{ctx.email ?? '—'}</span>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Set / change password</h2>
        <p className="text-xs text-muted-foreground">
          Set a password so you can sign in with email + password next time.
        </p>
        <PasswordForm />
      </section>

      <div className="border-t border-border pt-4">
        <SignOutButton />
      </div>
    </div>
  );
}
