'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useMemo } from 'react';
import { UserCircle } from 'lucide-react';
import { MODULES } from '@/lib/navigation';
import { type Capability, type Role, ROLE_LABELS } from '@/lib/roles';
import { visibleModules } from '@/domain/access/visible-modules';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/features/theme/theme-toggle';

export interface AppShellProps {
  role: Role;
  capabilities: Capability[];
  fullName: string | null;
  children: ReactNode;
}

export function AppShell({ role, capabilities, fullName, children }: AppShellProps) {
  const pathname = usePathname();
  const viewer = useMemo(
    () => ({ role, capabilities: new Set(capabilities) }),
    [role, capabilities],
  );

  // Nav = visible + built + flagged for nav. Grows automatically as modules ship.
  const navItems = useMemo(
    () => visibleModules(viewer, MODULES).filter((m) => m.inNav && m.enabled),
    [viewer],
  );

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Top header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">Guud OS</span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
            {ROLE_LABELS[role]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/account"
            aria-label="Account"
            className={cn(
              'flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:text-foreground',
              isActive('/account') ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {fullName && <span className="hidden sm:inline">{fullName}</span>}
            <UserCircle className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl">
        {/* Left rail (desktop) */}
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 border-r border-border p-3 md:block">
          <nav className="flex flex-col gap-1">
            {navItems.map((m) => {
              const Icon = m.icon;
              return (
                <Link
                  key={m.key}
                  href={m.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm',
                    isActive(m.href)
                      ? 'bg-accent font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {m.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:pb-8">{children}</main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch justify-around border-t border-border bg-background/95 backdrop-blur md:hidden">
        {navItems.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.key}
              href={m.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-xs',
                isActive(m.href) ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              {m.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
