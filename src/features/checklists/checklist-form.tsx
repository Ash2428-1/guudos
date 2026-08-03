'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitChecklistAction } from '@/features/checklists/actions';
import { type ChecklistItemDef, type ResponseValue } from '@/lib/checklists';
import { cn } from '@/lib/utils';

interface Props {
  instanceId: string;
  items: ChecklistItemDef[];
  initialResponses: Record<string, ResponseValue>;
}

export function ChecklistForm({ instanceId, items, initialResponses }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, ResponseValue>>(initialResponses);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (id: string, v: ResponseValue) =>
    setValues((prev) => ({ ...prev, [id]: { ...prev[id], ...v } }));

  async function onSubmit() {
    setBusy(true);
    setError('');
    try {
      const res = await submitChecklistAction(instanceId, values);
      const msg =
        res.ticketsRaised > 0
          ? `?flagged=${res.ticketsRaised}`
          : `?done=1`;
      router.push(`/checklists${msg}`);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : 'Could not save');
    }
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const v = values[item.id] ?? {};
        return (
          <div
            key={item.id}
            className="rounded-lg border border-border bg-card p-3"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <span className="text-sm font-medium">
                {item.label}
                {item.required && <span className="text-destructive"> *</span>}
              </span>
            </div>

            {item.inputType === 'bool' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set(item.id, { valueBool: true })}
                  className={cn(
                    'flex-1 rounded-md border px-3 py-2 text-sm font-medium',
                    v.valueBool === true
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground',
                  )}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => set(item.id, { valueBool: false })}
                  className={cn(
                    'flex-1 rounded-md border px-3 py-2 text-sm font-medium',
                    v.valueBool === false
                      ? 'border-destructive bg-destructive text-white'
                      : 'border-border text-muted-foreground',
                  )}
                >
                  No
                </button>
              </div>
            )}

            {item.inputType === 'number' && (
              <input
                type="number"
                inputMode="decimal"
                value={v.valueNumber ?? ''}
                onChange={(e) =>
                  set(item.id, {
                    valueNumber:
                      e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder={
                  item.minValue !== null || item.maxValue !== null
                    ? `Expected ${item.minValue ?? '–'} to ${item.maxValue ?? '–'}`
                    : 'Enter a number'
                }
              />
            )}

            {item.inputType === 'text' && (
              <textarea
                value={v.valueText ?? ''}
                onChange={(e) => set(item.id, { valueText: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="Notes"
              />
            )}
          </div>
        );
      })}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Sticky action bar — clears the mobile bottom nav (h-16). */}
      <div className="sticky bottom-20 z-20 md:bottom-4">
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Submit checklist'}
        </button>
      </div>
    </div>
  );
}
