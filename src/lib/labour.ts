/** Client-safe labour types. */

export interface ClockStatus {
  open: boolean;
  entryId: string | null;
  locationId: string | null;
  locationName: string | null;
  clockInISO: string | null;
}

export interface TodayEntry {
  id: string;
  locationName: string | null;
  clockInISO: string;
  clockOutISO: string | null;
  hours: number;
}

export interface LabourPersonRow {
  profileId: string;
  name: string;
  shifts: number;
  hours: number;
  lateCount: number;
  lateMinutes: number;
  cost: number;
  hasRate: boolean;
}
