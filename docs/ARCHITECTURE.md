# Guud OS — Architecture

Operational app for **Guud Mobility** (mobile healthcare). Forked from the
Florentin OS chassis; fresh domain layer for Guud.

## Stack
Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 ·
Supabase (Postgres + Auth + Storage + RLS) · Vercel · Resend · web-push/VAPID ·
Anthropic API. Deploy gates: `npm run gates` (typecheck + lint + test + build).

## Layers (clean architecture)
```
src/domain/*          Pure logic, no I/O. Unit-tested in tests/domain.
src/services/*        Data orchestration. `import "server-only"`.
src/infrastructure/*  Adapters: supabase, notifications, external APIs.
src/app/(app)/*       Authenticated routes (wrapped by the app shell).
src/app/login, /auth  Public auth routes.
src/features/*        Client components.
src/lib/*             Client-safe shared constants/helpers (roles, nav, csv, utils).
```
**Rule:** anything imported by a client component must be client-safe (never
`server-only`). Shared enums/constants live in `src/lib` and are imported by
both sides. Domain modules are pure, so client components may import them.

## Tenancy & access
Hierarchy: `organization → region → location (= mobile unit)`.

| Access role | Guud tier | Scope |
|---|---|---|
| `owner` | Central Lead | whole org, every capability |
| `manager` | Regional Manager | one region (`membership.region_id`) |
| `supervisor` | MUM | assigned mobile(s) |
| `staff` | Professional / Operator | assigned mobile(s) |

- **Capabilities** (`view_labour`, `view_vision`, `view_stock`,
  `view_assessments`, `view_hr`, `manage_checklists`) layer on top of role
  defaults. Source of truth: `src/lib/roles.ts` + `src/domain/access`.
- **RLS** enforces row scoping in Postgres. Helper fns (`user_org_ids`,
  `user_region_ids`, `user_has_location_access`, `user_has_capability`) are
  `SECURITY DEFINER`. The SQL capability defaults **must stay in sync** with
  `ROLE_DEFAULT_CAPABILITIES` in `src/domain/access/capabilities.ts`.
- `getSessionContext()` (cached) resolves user → membership → role/capabilities.
  Guards: `requireSession` / `requireManagement` / `requireCapability`.

## External systems (integration playbook)
Extend `src/infrastructure/external/client.ts` (typed client, env creds,
match filters, `{totalRecords,data}` envelope). Smoke-test filters live before
building UI. Planned links: schedules · Guud Pro (clock) · Fyne Forms (migrate) ·
tickets · Metabase · Guud Vision · Unleashed.

## Modules
Registry: `src/lib/navigation.ts` (`enabled: false` = coming soon, no dead
route). Build order: **Checklists** (first) → Clock/Labour → Tickets →
Schedules → Vision → Assessments → Stock.

## Gotchas (inherited)
- `next build` typecheck is stricter than standalone `tsc`.
- React 19 lint bans `setState` synchronously in an effect (see theme toggle —
  solved with CSS `dark:` variants instead of mount state).
- Next 16 renamed `middleware.ts` → **`proxy.ts`** (function `proxy`).
- Fixed/sticky bottom bars must clear the mobile bottom nav (`bottom-16`+).
- Env/secret changes need a redeploy to take effect.

## Setup
1. `cp .env.example .env.local` and fill Supabase + service keys.
2. Apply `supabase/migrations/0001_foundation.sql` to your Supabase project.
3. `npm run dev`. Sign in via magic link; seed a membership to see the tiles.
