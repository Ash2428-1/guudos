'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  extractWorkOrderAction,
  saveWorkOrderAction,
} from '@/features/work-orders/actions';
import { type WorkOrderFields } from '@/lib/work-orders';

const inputCls =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary';

export function WorkOrderForm({
  id,
  initial,
}: {
  id: string | null;
  initial: WorkOrderFields;
}) {
  const router = useRouter();
  const [f, setF] = useState<WorkOrderFields>(initial);
  const [extracting, setExtracting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const set = <K extends keyof WorkOrderFields>(k: K, v: WorkOrderFields[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  function onFile(file: File) {
    setMsg('');
    setExtracting(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = String(reader.result).split(',')[1];
        const res = await extractWorkOrderAction(base64, file.type);
        if (res.ok) {
          setF((prev) => ({ ...prev, ...res.fields }));
          setMsg('Fields auto-filled from the document — please review.');
        } else if (res.reason === 'not_configured') {
          setMsg('AI extraction isn’t switched on yet (no Anthropic key). Fill the form manually.');
        } else {
          setMsg(`Could not read the document: ${res.message ?? 'error'}. Fill manually.`);
        }
      } finally {
        setExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    setBusy(true);
    setMsg('');
    try {
      const newId = await saveWorkOrderAction(id, f);
      router.push(`/work-orders/${newId}?saved=1`);
    } catch (e) {
      setBusy(false);
      setMsg(e instanceof Error ? e.message : 'Could not save');
    }
  }

  const T = (label: string, k: keyof WorkOrderFields, area = false) => (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {area ? (
        <textarea
          rows={2}
          value={(f[k] as string) ?? ''}
          onChange={(e) => set(k, e.target.value as WorkOrderFields[typeof k])}
          className={inputCls}
        />
      ) : (
        <input
          value={(f[k] as string) ?? ''}
          onChange={(e) => set(k, e.target.value as WorkOrderFields[typeof k])}
          className={inputCls}
        />
      )}
    </label>
  );
  const N = (label: string, k: keyof WorkOrderFields) => (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <input
        type="number"
        value={(f[k] as number | null) ?? ''}
        onChange={(e) =>
          set(k, (e.target.value === '' ? null : Number(e.target.value)) as WorkOrderFields[typeof k])
        }
        className={inputCls}
      />
    </label>
  );
  const B = (label: string, k: keyof WorkOrderFields) => (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={(f[k] as boolean | null) ?? false}
        onChange={(e) => set(k, e.target.checked as WorkOrderFields[typeof k])}
      />
      {label}
    </label>
  );

  return (
    <div className="space-y-5">
      {/* AI capture */}
      <div className="rounded-lg border border-dashed border-border bg-card p-3">
        <div className="text-sm font-medium">Capture from a work order (photo or PDF)</div>
        <p className="mb-2 text-xs text-muted-foreground">
          Upload the client’s work order and we’ll auto-fill the fields for you to review.
        </p>
        <input
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          disabled={extracting}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
        />
        {extracting && <p className="mt-2 text-xs text-muted-foreground">Reading document…</p>}
      </div>

      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Client</h2>
        {T('Client name', 'clientName')}
        {T('SKAE / contact', 'skaeContact')}
        {B('Client approval received', 'clientApproval')}
      </section>

      <section className="grid grid-cols-3 gap-2">
        {N('Total employees', 'totalEmployees')}
        {N('To be assessed', 'employeesToAssess')}
        {N('Mobiles required', 'mobilesRequired')}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Dates & sites</h2>
        {T('Assessment date(s)', 'assessmentDates')}
        {T('Sites / addresses', 'sites', true)}
        {T('Contact person on site', 'contactOnSite')}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Operations</h2>
        {T('Operational times', 'operationalTimes', true)}
        {T('Site check-in time', 'siteCheckinTime')}
        {T('Arrival prior to operations', 'arrivalInfo')}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Site facilities</h2>
        {T('Access requirements', 'accessRequirements')}
        <div className="flex gap-4">
          {B('Parking / setup space', 'parking')}
          {B('Overnight parking', 'overnightParking')}
        </div>
        {T('Plug point (overnight charging)', 'plugPoint')}
        {T('Network / signal', 'network')}
        {T('Medical waste disposal', 'wasteDisposal')}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Scope & other</h2>
        {T('Services', 'services', true)}
        {T('Vehicle requirements', 'vehicleRequirements', true)}
        {T('Health & safety officer', 'hsOfficer')}
        {T('Referral details', 'referralDetails', true)}
        {T('Notes', 'notes', true)}
      </section>

      <div className="sticky bottom-20 z-20 md:bottom-4">
        <button
          type="button"
          onClick={save}
          disabled={busy || extracting}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg disabled:opacity-60"
        >
          {busy ? 'Saving…' : id ? 'Save work order' : 'Create work order'}
        </button>
      </div>
    </div>
  );
}
