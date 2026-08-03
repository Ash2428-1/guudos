import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/infrastructure/supabase/server';
import { getSessionContext } from '@/services/auth/session';
import { SignOutButton } from '@/features/auth/sign-out-button';

/**
 * Landing for a signed-in user who has no membership yet. Sits OUTSIDE the
 * (app) group so it never triggers requireSession's membership redirect.
 * Once the user IS provisioned, forward them straight to the home tiles.
 */
export default async function WelcomePage() {
  const ctx = await getSessionContext();
  if (ctx) redirect('/');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="text-2xl font-bold tracking-tight">Guud OS</div>
        <p className="text-sm text-muted-foreground">
          You&apos;re signed in as{' '}
          <span className="font-medium text-foreground">{user.email}</span>, but
          your account isn&apos;t linked to a mobile or region yet.
        </p>
        <p className="text-sm text-muted-foreground">
          Ask a Central Lead to add you, then reload.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
