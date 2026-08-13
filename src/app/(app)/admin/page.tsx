import { requireOwner } from '@/services/auth/session';
import {
  listCrewByMobile,
  listMobiles,
  listPeople,
  listRegions,
} from '@/services/admin/service';
import {
  createMobileAction,
  createRegionAction,
  invitePersonAction,
} from '@/features/admin/actions';
import {
  JOB_FUNCTIONS,
  JOB_FUNCTION_LABELS,
  ROLES,
  ROLE_LABELS,
} from '@/lib/roles';

const inputCls =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireOwner();
  const [regions, mobiles, people, crew, sp] = await Promise.all([
    listRegions(),
    listMobiles(),
    listPeople(),
    listCrewByMobile(),
    searchParams,
  ]);

  const banner =
    sp.invited === 'new'
      ? 'Person added. If you set a password, give it to them — they sign in with email + password now.'
      : sp.invited === 'existing'
        ? 'Existing user updated and assigned.'
        : sp.created === 'region'
          ? 'Region created.'
          : sp.created === 'mobile'
            ? 'Mobile created.'
            : sp.err === 'pw'
              ? 'Password must be at least 8 characters.'
              : sp.err
                ? 'Please fill in the required fields.'
                : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Regions, mobiles &amp; people</p>
      </div>

      {banner && (
        <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
          {banner}
        </div>
      )}

      {/* Regions */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Regions</h2>
        <div className="space-y-1">
          {regions.map((r) => (
            <div key={r.id} className="rounded-md border border-border bg-card px-3 py-2 text-sm">
              {r.name}
            </div>
          ))}
        </div>
        <details className="rounded-lg border border-border bg-card">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">+ Add region</summary>
          <form action={createRegionAction} className="space-y-2 border-t border-border p-3">
            <input name="name" required placeholder="Region name" className={inputCls} />
            <button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
              Add region
            </button>
          </form>
        </details>
      </section>

      {/* Mobiles */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Mobiles</h2>
        <div className="space-y-1">
          {mobiles.map((m) => {
            const members = crew[m.id] ?? [];
            return (
              <details key={m.id} className="rounded-md border border-border bg-card">
                <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm">
                  <span>{m.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {[m.code, m.regionName, members.length ? `${members.length} crew` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </summary>
                <div className="border-t border-border px-3 py-2">
                  {members.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No crew listed.</p>
                  ) : (
                    <ul className="space-y-1">
                      {members.map((c, i) => (
                        <li key={i} className="flex justify-between text-xs">
                          <span>{c.name}</span>
                          <span className="text-muted-foreground">{c.role}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            );
          })}
        </div>
        <details className="rounded-lg border border-border bg-card">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">+ Add mobile</summary>
          <form action={createMobileAction} className="space-y-2 border-t border-border p-3">
            <input name="name" required placeholder="Mobile name (e.g. Mobile 02)" className={inputCls} />
            <input name="code" placeholder="Code (optional)" className={inputCls} />
            <select name="regionId" required className={inputCls} defaultValue="">
              <option value="" disabled>
                Choose region…
              </option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
              Add mobile
            </button>
          </form>
        </details>
      </section>

      {/* People */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">People</h2>
        <div className="space-y-1">
          {people.map((p) => (
            <div key={p.profileId} className="rounded-md border border-border bg-card px-3 py-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{p.fullName ?? p.email}</span>
                <span className="text-xs text-muted-foreground">{ROLE_LABELS[p.role]}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {p.email}
                {p.mobiles.length > 0 && ` · ${p.mobiles.join(', ')}`}
              </div>
            </div>
          ))}
        </div>
        <details className="rounded-lg border border-border bg-card">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">+ Add person</summary>
          <form action={invitePersonAction} className="space-y-2 border-t border-border p-3">
            <input name="fullName" required placeholder="Full name" className={inputCls} />
            <input name="email" type="email" required placeholder="Email" className={inputCls} />
            <input
              name="password"
              type="text"
              autoComplete="off"
              placeholder="Initial password (optional, 8+ chars) — hand it to them"
              className={inputCls}
            />
            <div className="grid grid-cols-2 gap-2">
              <select name="role" required className={inputCls} defaultValue="staff">
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <select name="jobFunction" className={inputCls} defaultValue="">
                <option value="">Job (optional)</option>
                {JOB_FUNCTIONS.map((j) => (
                  <option key={j} value={j}>
                    {JOB_FUNCTION_LABELS[j]}
                  </option>
                ))}
              </select>
            </div>
            <select name="regionId" className={inputCls} defaultValue="">
              <option value="">Region (for Regional Managers)</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {mobiles.length > 0 && (
              <fieldset className="rounded-md border border-border p-2">
                <legend className="px-1 text-xs text-muted-foreground">
                  Assign to mobiles
                </legend>
                <div className="grid grid-cols-2 gap-1">
                  {mobiles.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="mobileIds" value={m.id} />
                      {m.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
              Add person
            </button>
          </form>
        </details>
      </section>
    </div>
  );
}
