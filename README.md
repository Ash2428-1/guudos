# Guud OS

Mobile-first operational app for **Guud Mobility** (mobile healthcare).
Live: **https://guud-os.vercel.app**

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 ·
Supabase (Postgres + Auth + RLS) · deployed on Vercel.

---

## Local setup
```bash
npm install
cp .env.example .env.local      # fill in the values (see below)
npm run dev                     # http://localhost:3000
```
Unauthenticated users are redirected to `/login` (email+password, with
magic-link and password-reset fallbacks).

### Environment variables (`.env.local`)
See `.env.example`. The essentials:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; used by cron + provisioning scripts.
- `CRON_SECRET` — guards `/api/cron/*`.
- `SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM` — outbound email (Brevo).
- External integrations (optional, per system): `GUUD_TICKETS_*`, `METABASE_*`,
  `GUUD_VISION_*`, `UNLEASHED_*`, etc. — each degrades gracefully when unset.

## Scripts
| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run gates` | **Run before every deploy:** typecheck + lint + vitest + build |
| `npm run test` | Vitest (pure domain unit tests) |
| `npm run build` | Production build |

## Architecture (clean layers)
- `src/domain/*` — pure logic, no I/O, unit-tested (`tests/domain`).
- `src/services/*` — data orchestration, `import 'server-only'`.
- `src/infrastructure/*` — adapters: `supabase/`, `notifications/` (SMTP),
  `external/` (typed clients for Guud's outside systems).
- `src/app/(app)/*` — authenticated routes; `src/features/*` — client components.
- `src/lib/*` — **client-safe** shared constants/types (roles, nav, module registry).
- `src/proxy.ts` — Next 16 middleware (session refresh + auth gate). *(Note: Next 16
  renamed `middleware.ts` → `proxy.ts`.)*

See `docs/ARCHITECTURE.md` for detail.

## Access model
Roles (RLS-enforced): `owner` (Central Lead, all regions) · `manager` (Regional
Manager, one region) · `supervisor` (MUM, assigned mobile[s]) · `staff`. Plus
per-capability flags (`view_labour/vision/stock/assessments`, `manage_checklists`).
Hierarchy: `organization → region → location` (a "location" is a mobile unit).
Helper SQL functions (`user_org_ids()`, `user_region_ids()`,
`user_has_location_access()`, `user_has_capability()`) back every RLS policy.

## Database
Migrations live in `supabase/migrations/` — **apply in numeric order** in the
Supabase SQL editor (or via CLI):
- `0001_foundation` — tenancy, identity, RLS helpers
- `0002_checklists`, `0003_labour`, `0004_daily_reports`, `0005_vision`,
  `0006_mobile_crew`, `0007_fix_region_scope`

Provisioning / seed helpers (run with `node --env-file=.env.local scripts/<x>.mjs`):
`bootstrap-owner`, `provision-team`, `provision-batch2`, `seed-checklist`,
`seed-payrates`, `populate-crew`.

## Modules
Checklists · Tickets · Overview (RM dashboard) · Admin (regions/mobiles/people +
set-password) · Labour (clock + hours/lateness/cost) · Daily Reports (+ 7am email
cron) · Vision (specs cut/not-cut) · Assessments (Metabase). The nav/home tiles are
driven by `src/lib/navigation.ts` (`MODULES`), filtered per session role/capability.

## Integrations
External clients in `src/infrastructure/external/` (extend `ExternalApiClient`),
all env-guarded so the app runs without them:
- **Wired, pending creds:** Guud tickets push, Metabase (Assessments), Guud Vision.
- **Not built yet:** Unleashed (Stock), Schedules, Guud Pro → Labour sync.

## Deploy
```bash
npm run gates
vercel deploy --prod --scope restos1
```
Hosted on the **restos1** Vercel team as project **guud-os**. Env vars are set in
Vercel (Production); `vercel.json` defines the daily report cron (07:00 SAST).
Env/secret changes require a redeploy to take effect.

## Gotchas (hard-won)
- `next build` typechecks stricter than standalone `tsc`.
- `import 'server-only'` modules can't be imported by client components — keep
  shared enums/types in `src/lib`.
- Sticky bottom bars must clear the mobile nav (`sticky bottom-20 md:bottom-4`).
- `/api/cron/*` must be in `proxy.ts` `PUBLIC_PATHS` or Vercel Cron gets
  redirected to `/login`.
- Setting Vercel env via a shell pipe can append a newline — feed values via
  redirected stdin (breaks `CRON_SECRET` as an HTTP header otherwise).
