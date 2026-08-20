/** Client-safe types for the Work Order → Movement Order module. */

export type WorkOrderStatus = 'draft' | 'confirmed';

/** The editable Work Order fields (mirror the client work-order template). */
export interface WorkOrderFields {
  clientName: string | null;
  skaeContact: string | null;
  clientApproval: boolean | null;
  totalEmployees: number | null;
  employeesToAssess: number | null;
  mobilesRequired: number | null;
  assessmentDates: string | null;
  sites: string | null;
  operationalTimes: string | null;
  arrivalInfo: string | null;
  siteCheckinTime: string | null;
  accessRequirements: string | null;
  parking: boolean | null;
  overnightParking: boolean | null;
  plugPoint: string | null;
  network: string | null;
  wasteDisposal: string | null;
  services: string | null;
  vehicleRequirements: string | null;
  hsOfficer: string | null;
  referralDetails: string | null;
  contactOnSite: string | null;
  notes: string | null;
}

export interface WorkOrderRow extends WorkOrderFields {
  id: string;
  status: WorkOrderStatus;
  sourceFilePath: string | null;
  createdAt: string;
}

export const EMPTY_WORK_ORDER: WorkOrderFields = {
  clientName: null, skaeContact: null, clientApproval: null,
  totalEmployees: null, employeesToAssess: null, mobilesRequired: null,
  assessmentDates: null, sites: null, operationalTimes: null, arrivalInfo: null,
  siteCheckinTime: null, accessRequirements: null, parking: null,
  overnightParking: null, plugPoint: null, network: null, wasteDisposal: null,
  services: null, vehicleRequirements: null, hsOfficer: null,
  referralDetails: null, contactOnSite: null, notes: null,
};

/** Movement Order team + contacts + itinerary. */
export interface TeamMember {
  role: string;
  name: string;
  phone: string;
}
export interface PocContact {
  group: string; // "Health HOD" | "OPS"
  role: string;
  name: string;
  phone: string;
}
export interface MovementLeg {
  date: string | null;
  from: string;
  to: string;
  detail: string;
  notes: string;
  mapsLink: string;
}

export interface MovementOrderFields {
  projectName: string | null;
  manager: string | null;
  region: string | null;
  reasonForTravel: string | null;
  macName: string | null;
  macReg: string | null;
  province: string | null;
  startDate: string | null;
  startingPoint: string | null;
  locationId: string | null;
  team: TeamMember[];
  pocContacts: PocContact[];
}

/** The team roles a Movement Order captures (matches the crew roster). */
export const MOVEMENT_TEAM_ROLES = [
  'Operator',
  'PHC / Nurse',
  'Optometrist',
  'Optical Dispenser',
  'MUM',
] as const;
