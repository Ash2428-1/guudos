import 'server-only';
import { requireManager } from '@/services/auth/session';
import { createSupabaseServerClient } from '@/infrastructure/supabase/server';
import {
  type WorkOrderFields,
  type WorkOrderRow,
  type WorkOrderStatus,
} from '@/lib/work-orders';

function toRow(f: WorkOrderFields) {
  return {
    client_name: f.clientName,
    skae_contact: f.skaeContact,
    client_approval: f.clientApproval,
    total_employees: f.totalEmployees,
    employees_to_assess: f.employeesToAssess,
    mobiles_required: f.mobilesRequired,
    assessment_dates: f.assessmentDates,
    sites: f.sites,
    operational_times: f.operationalTimes,
    arrival_info: f.arrivalInfo,
    site_checkin_time: f.siteCheckinTime,
    access_requirements: f.accessRequirements,
    parking: f.parking,
    overnight_parking: f.overnightParking,
    plug_point: f.plugPoint,
    network: f.network,
    waste_disposal: f.wasteDisposal,
    services: f.services,
    vehicle_requirements: f.vehicleRequirements,
    hs_officer: f.hsOfficer,
    referral_details: f.referralDetails,
    contact_on_site: f.contactOnSite,
    notes: f.notes,
  };
}

function fromRow(r: Record<string, unknown>): WorkOrderRow {
  const s = (k: string) => (r[k] as string | null) ?? null;
  const n = (k: string) => (r[k] as number | null) ?? null;
  const b = (k: string) => (r[k] as boolean | null) ?? null;
  return {
    id: r.id as string,
    status: (r.status as WorkOrderStatus) ?? 'draft',
    sourceFilePath: s('source_file_path'),
    createdAt: r.created_at as string,
    clientName: s('client_name'),
    skaeContact: s('skae_contact'),
    clientApproval: b('client_approval'),
    totalEmployees: n('total_employees'),
    employeesToAssess: n('employees_to_assess'),
    mobilesRequired: n('mobiles_required'),
    assessmentDates: s('assessment_dates'),
    sites: s('sites'),
    operationalTimes: s('operational_times'),
    arrivalInfo: s('arrival_info'),
    siteCheckinTime: s('site_checkin_time'),
    accessRequirements: s('access_requirements'),
    parking: b('parking'),
    overnightParking: b('overnight_parking'),
    plugPoint: s('plug_point'),
    network: s('network'),
    wasteDisposal: s('waste_disposal'),
    services: s('services'),
    vehicleRequirements: s('vehicle_requirements'),
    hsOfficer: s('hs_officer'),
    referralDetails: s('referral_details'),
    contactOnSite: s('contact_on_site'),
    notes: s('notes'),
  };
}

export interface WorkOrderSummary {
  id: string;
  clientName: string | null;
  assessmentDates: string | null;
  mobilesRequired: number | null;
  status: WorkOrderStatus;
  createdAt: string;
}

export async function listWorkOrders(): Promise<WorkOrderSummary[]> {
  const ctx = await requireManager();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('work_orders')
    .select('id, client_name, assessment_dates, mobiles_required, status, created_at')
    .eq('organization_id', ctx.organizationId)
    .order('created_at', { ascending: false });
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    clientName: (r.client_name as string | null) ?? null,
    assessmentDates: (r.assessment_dates as string | null) ?? null,
    mobilesRequired: (r.mobiles_required as number | null) ?? null,
    status: (r.status as WorkOrderStatus) ?? 'draft',
    createdAt: r.created_at as string,
  }));
}

export async function getWorkOrder(id: string): Promise<WorkOrderRow | null> {
  await requireManager();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('work_orders').select('*').eq('id', id).maybeSingle();
  return data ? fromRow(data as Record<string, unknown>) : null;
}

export async function createWorkOrder(fields: WorkOrderFields): Promise<string> {
  const ctx = await requireManager();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('work_orders')
    .insert({ organization_id: ctx.organizationId, created_by: ctx.userId, ...toRow(fields) })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function updateWorkOrder(id: string, fields: WorkOrderFields): Promise<void> {
  await requireManager();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('work_orders').update(toRow(fields)).eq('id', id);
  if (error) throw new Error(error.message);
}
