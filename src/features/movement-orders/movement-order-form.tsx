'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  loadTeamAction,
  saveMovementOrderAction,
} from '@/features/movement-orders/actions';
import { type MovementLeg, type MovementOrderFields } from '@/lib/work-orders';

const cls =
  'w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary';

interface Mobile {
  id: string;
  name: string;
  code: string | null;
}

export function MovementOrderForm({
  id,
  initial,
  initialLegs,
  mobiles,
}: {
  id: string;
  initial: MovementOrderFields;
  initialLegs: MovementLeg[];
  mobiles: Mobile[];
}) {
  const router = useRouter();
  const [f, setF] = useState<MovementOrderFields>(initial);
  const [legs, setLegs] = useState<MovementLeg[]>(
    initialLegs.length ? initialLegs : [{ date: null, from: '', to: '', detail: '', notes: '', mapsLink: '' }],
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const setField = <K extends keyof MovementOrderFields>(k: K, v: MovementOrderFields[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  async function onPickMobile(locationId: string) {
    const m = mobiles.find((x) => x.id === locationId);
    setF((p) => ({ ...p, locationId, macName: m?.name ?? null, macReg: m?.code ?? p.macReg }));
    if (locationId) {
      const team = await loadTeamAction(locationId);
      if (team.length) setF((p) => ({ ...p, team }));
    }
  }

  // array editors
  const updTeam = (i: number, patch: Partial<(typeof f.team)[number]>) =>
    setF((p) => ({ ...p, team: p.team.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));
  const updPoc = (i: number, patch: Partial<(typeof f.pocContacts)[number]>) =>
    setF((p) => ({ ...p, pocContacts: p.pocContacts.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));
  const updLeg = (i: number, patch: Partial<MovementLeg>) =>
    setLegs((p) => p.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  async function save() {
    setBusy(true);
    setMsg('');
    try {
      await saveMovementOrderAction(id, f, legs);
      router.push(`/movement-orders/${id}?saved=1`);
    } catch (e) {
      setBusy(false);
      setMsg(e instanceof Error ? e.message : 'Could not save');
    }
  }

  const T = (label: string, k: keyof MovementOrderFields, area = false) => (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {area ? (
        <textarea rows={2} value={(f[k] as string) ?? ''} onChange={(e) => setField(k, e.target.value as MovementOrderFields[typeof k])} className={cls} />
      ) : (
        <input value={(f[k] as string) ?? ''} onChange={(e) => setField(k, e.target.value as MovementOrderFields[typeof k])} className={cls} />
      )}
    </label>
  );

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Deployment</h2>
        {T('Project name', 'projectName')}
        <div className="grid grid-cols-2 gap-2">
          {T('Manager', 'manager')}
          {T('Region', 'region')}
        </div>
        {T('Reason for travel', 'reasonForTravel', true)}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Mobile (MAC)</h2>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Select mobile — pulls its crew as the team</span>
          <select value={f.locationId ?? ''} onChange={(e) => onPickMobile(e.target.value)} className={cls}>
            <option value="">Choose mobile…</option>
            {mobiles.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {T('MAC name', 'macName')}
          {T('MAC reg', 'macReg')}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {T('Province', 'province')}
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Start date</span>
            <input type="date" value={f.startDate ?? ''} onChange={(e) => setField('startDate', e.target.value)} className={cls} />
          </label>
        </div>
        {T('Starting point', 'startingPoint')}
      </section>

      {/* Team */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Team</h2>
          <button type="button" onClick={() => setF((p) => ({ ...p, team: [...p.team, { role: '', name: '', phone: '' }] }))} className="text-xs text-primary">+ add</button>
        </div>
        {f.team.map((t, i) => (
          <div key={i} className="grid grid-cols-[1fr,1fr,1fr,auto] gap-1">
            <input placeholder="Role" value={t.role} onChange={(e) => updTeam(i, { role: e.target.value })} className={cls} />
            <input placeholder="Name" value={t.name} onChange={(e) => updTeam(i, { name: e.target.value })} className={cls} />
            <input placeholder="Phone" value={t.phone} onChange={(e) => updTeam(i, { phone: e.target.value })} className={cls} />
            <button type="button" onClick={() => setF((p) => ({ ...p, team: p.team.filter((_, j) => j !== i) }))} className="px-2 text-muted-foreground hover:text-destructive">×</button>
          </div>
        ))}
      </section>

      {/* POC contacts */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Contacts (POC)</h2>
          <button type="button" onClick={() => setF((p) => ({ ...p, pocContacts: [...p.pocContacts, { group: '', role: '', name: '', phone: '' }] }))} className="text-xs text-primary">+ add</button>
        </div>
        {f.pocContacts.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr,1fr,1fr,1fr,auto] gap-1">
            <input placeholder="Group" value={c.group} onChange={(e) => updPoc(i, { group: e.target.value })} className={cls} />
            <input placeholder="Role" value={c.role} onChange={(e) => updPoc(i, { role: e.target.value })} className={cls} />
            <input placeholder="Name" value={c.name} onChange={(e) => updPoc(i, { name: e.target.value })} className={cls} />
            <input placeholder="Phone" value={c.phone} onChange={(e) => updPoc(i, { phone: e.target.value })} className={cls} />
            <button type="button" onClick={() => setF((p) => ({ ...p, pocContacts: p.pocContacts.filter((_, j) => j !== i) }))} className="px-2 text-muted-foreground hover:text-destructive">×</button>
          </div>
        ))}
      </section>

      {/* Movement legs */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Movement details (itinerary)</h2>
          <button type="button" onClick={() => setLegs((p) => [...p, { date: null, from: '', to: '', detail: '', notes: '', mapsLink: '' }])} className="text-xs text-primary">+ add day</button>
        </div>
        {legs.map((l, i) => (
          <div key={i} className="space-y-1 rounded-md border border-border p-2">
            <div className="grid grid-cols-[auto,1fr,1fr,auto] gap-1">
              <input type="date" value={l.date ?? ''} onChange={(e) => updLeg(i, { date: e.target.value })} className={cls} />
              <input placeholder="From" value={l.from} onChange={(e) => updLeg(i, { from: e.target.value })} className={cls} />
              <input placeholder="To" value={l.to} onChange={(e) => updLeg(i, { to: e.target.value })} className={cls} />
              <button type="button" onClick={() => setLegs((p) => p.filter((_, j) => j !== i))} className="px-2 text-muted-foreground hover:text-destructive">×</button>
            </div>
            <input placeholder="Detail" value={l.detail} onChange={(e) => updLeg(i, { detail: e.target.value })} className={cls} />
            <div className="grid grid-cols-2 gap-1">
              <input placeholder="Notes / times" value={l.notes} onChange={(e) => updLeg(i, { notes: e.target.value })} className={cls} />
              <input placeholder="Maps link" value={l.mapsLink} onChange={(e) => updLeg(i, { mapsLink: e.target.value })} className={cls} />
            </div>
          </div>
        ))}
      </section>

      {msg && <p className="text-sm text-destructive">{msg}</p>}

      <div className="sticky bottom-20 z-20 flex gap-2 md:bottom-4">
        <button type="button" onClick={save} disabled={busy} className="flex-1 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg disabled:opacity-60">
          {busy ? 'Saving…' : 'Save movement order'}
        </button>
        <Link href={`/movement-orders/${id}/print`} className="rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium shadow-lg">
          View / print
        </Link>
      </div>
    </div>
  );
}
