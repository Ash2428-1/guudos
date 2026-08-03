'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { MODULES } from '@/lib/navigation';
import { type Capability, type Role } from '@/lib/roles';
import { visibleModules } from '@/domain/access/visible-modules';
import { cn } from '@/lib/utils';

export interface HomeTilesProps {
  role: Role;
  capabilities: Capability[];
}

export function HomeTiles({ role, capabilities }: HomeTilesProps) {
  const tiles = useMemo(
    () =>
      visibleModules({ role, capabilities: new Set(capabilities) }, MODULES).filter(
        (m) => m.key !== 'home',
      ),
    [role, capabilities],
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {tiles.map((m) => {
        const Icon = m.icon;
        const body = (
          <div
            className={cn(
              'flex h-full flex-col gap-2 rounded-xl border border-border p-4 transition',
              m.enabled
                ? 'bg-card hover:border-foreground/30 hover:shadow-sm'
                : 'bg-muted/40 opacity-70',
            )}
          >
            <div className="flex items-center justify-between">
              <Icon className="h-6 w-6" />
              {!m.enabled && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Soon
                </span>
              )}
            </div>
            <div>
              <div className="font-semibold">{m.label}</div>
              <div className="text-xs text-muted-foreground">{m.description}</div>
            </div>
          </div>
        );

        return m.enabled ? (
          <Link key={m.key} href={m.href} className="block">
            {body}
          </Link>
        ) : (
          <div key={m.key} aria-disabled className="block cursor-not-allowed">
            {body}
          </div>
        );
      })}
    </div>
  );
}
