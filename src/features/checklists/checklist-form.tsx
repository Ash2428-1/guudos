'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { submitChecklistAction } from '@/features/checklists/actions';
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/browser';
import { type ChecklistItemDef, type ResponseValue } from '@/lib/checklists';
import { cn } from '@/lib/utils';

const PHOTO_BUCKET = 'checklist-photos';

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

  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const set = (id: string, v: ResponseValue) =>
    setValues((prev) => ({ ...prev, [id]: { ...prev[id], ...v } }));

  // Load previews for photos already attached (signed URLs, private bucket).
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    for (const i of items) {
      if (i.inputType !== 'photo') continue;
      const path = initialResponses[i.id]?.valueText;
      if (!path) continue;
      void supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(path, 3600)
        .then(({ data }) => {
          if (data?.signedUrl) setPreviews((p) => ({ ...p, [i.id]: data.signedUrl }));
        });
    }
  }, [items, initialResponses]);

  async function uploadPhoto(item: ChecklistItemDef, file: File) {
    const supabase = createSupabaseBrowserClient();
    setError('');
    setUploading((u) => ({ ...u, [item.id]: true }));
    const path = `${instanceId}/${item.id}`;
    const { error: upErr } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    setUploading((u) => ({ ...u, [item.id]: false }));
    if (upErr) {
      setError(`Photo upload failed: ${upErr.message}`);
      return;
    }
    set(item.id, { valueText: path });
    setPreviews((p) => ({ ...p, [item.id]: URL.createObjectURL(file) }));
  }

  async function onSubmit() {
    setBusy(true);
    setError('');
    try {
      const res = await submitChecklistAction(instanceId, values);
      const msg = res.ticketsRaised > 0 ? `?flagged=${res.ticketsRaised}` : `?done=1`;
      router.push(`/checklists${msg}`);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : 'Could not save');
    }
  }

  // Group items by section, preserving first-appearance order.
  const sections: string[] = [];
  for (const it of items) {
    const s = it.section ?? '';
    if (!sections.includes(s)) sections.push(s);
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <section key={section || '_'} className="space-y-2">
          {section && (
            <h2 className="pt-1 text-sm font-semibold text-muted-foreground">{section}</h2>
          )}
          {items
            .filter((it) => (it.section ?? '') === section)
            .map((item) => {
              const v = values[item.id] ?? {};
              return (
                <div key={item.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="mb-2 text-sm font-medium">
                    {item.label}
                    {item.required && <span className="text-destructive"> *</span>}
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

                  {item.inputType === 'select' && (
                    <div className="flex flex-col gap-1.5">
                      {(item.options ?? []).map((opt) => {
                        const selected = v.valueText === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => set(item.id, { valueText: opt.value })}
                            className={cn(
                              'rounded-md border px-3 py-2 text-left text-sm',
                              selected && opt.flag
                                ? 'border-destructive bg-destructive/10 font-medium text-destructive'
                                : selected
                                  ? 'border-primary bg-primary/10 font-medium text-foreground'
                                  : 'border-border text-muted-foreground hover:bg-accent',
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {item.inputType === 'photo' && (
                    <div className="space-y-2">
                      {previews[item.id] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previews[item.id]}
                          alt="attached"
                          className="max-h-48 rounded-md border border-border"
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadPhoto(item, f);
                        }}
                        className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
                      />
                      {uploading[item.id] ? (
                        <p className="text-xs text-muted-foreground">Uploading…</p>
                      ) : (
                        v.valueText && <p className="text-xs text-primary">✓ Photo attached</p>
                      )}
                    </div>
                  )}

                  {item.inputType === 'number' && (
                    <input
                      type="number"
                      inputMode="decimal"
                      value={v.valueNumber ?? ''}
                      onChange={(e) =>
                        set(item.id, {
                          valueNumber: e.target.value === '' ? null : Number(e.target.value),
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
        </section>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}

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
