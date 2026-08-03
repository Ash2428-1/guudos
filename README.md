# Guud OS

Mobile-first operational app for **Guud Mobility** (mobile healthcare). Forked
from the Florentin OS chassis. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Quick start
```bash
cp .env.example .env.local   # fill in Supabase + secrets
npm run dev
```
Open http://localhost:3000 — unauthenticated users are sent to `/login`
(magic-link sign-in).

## Scripts
| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run gates` | typecheck + lint + test + build (run before every deploy) |
| `npm run test` | Vitest (domain unit tests) |
| `npm run build` | Production build |

## Status
**Foundation (chassis) complete:** tenancy + RLS, magic-link auth + session
context, role/capability model (3 mgmt tiers), mobile-first PWA shell with
role-based home tiles, notification/cron/KPI/external-API scaffolds.

**Next module:** Checklists (MUM + Operator, migrated off Fyne Forms; flagged
items raise tickets).

## Deploy
`npm run gates` then `vercel deploy --prod --yes`. Set env vars in Vercel
(prod + preview + dev) and redeploy for secrets to take effect.
