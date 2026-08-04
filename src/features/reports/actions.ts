'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { upsertDailyReport } from '@/services/reports/service';

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim();
  return s || null;
}
function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function saveDailyReportAction(formData: FormData) {
  const locationId = String(formData.get('locationId'));
  const date = String(formData.get('date'));
  if (!locationId || !date) redirect('/reports?err=1');

  await upsertDailyReport(locationId, date, {
    startOfServices: str(formData.get('startOfServices')),
    endOfServices: str(formData.get('endOfServices')),
    firstEnrolledAt: str(formData.get('firstEnrolledAt')),
    firstPhcAt: str(formData.get('firstPhcAt')),
    avgPhcMinutes: num(formData.get('avgPhcMinutes')),
    specsDispensed: num(formData.get('specsDispensed')),
    specsNoStock: num(formData.get('specsNoStock')),
    notes: str(formData.get('notes')),
  });
  revalidatePath('/reports');
  redirect(`/reports?date=${date}&saved=1`);
}
