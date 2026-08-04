/** Client-safe daily-report types. */

export interface DailyReportFields {
  startOfServices: string | null; // 'HH:MM'
  endOfServices: string | null;
  firstEnrolledAt: string | null;
  firstPhcAt: string | null;
  avgPhcMinutes: number | null; // Goodx (manual for now)
  specsDispensed: number | null; // iTrust (manual for now)
  specsNoStock: number | null;
  notes: string | null;
}

export interface DailyReportView extends DailyReportFields {
  locationId: string;
  locationName: string;
  date: string;
  hasReport: boolean;
  serviceMinutes: number | null;
  cumulativeBacklog: number; // derived: running sum of specsNoStock to date
}

/** The auto-populated-later fields, flagged in the UI. */
export const EXTERNAL_FIELDS = {
  avgPhcMinutes: 'Goodx',
  specsDispensed: 'iTrust',
} as const;
