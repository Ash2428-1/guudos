import 'server-only';
import { EXTRACTION_MODEL, getAnthropic } from '@/infrastructure/ai/anthropic';
import { type WorkOrderFields } from '@/lib/work-orders';
import { docxToText } from '@/services/work-orders/docx';

const DOCX_MEDIA =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const EMPTY: WorkOrderFields = {
  clientName: null, skaeContact: null, clientApproval: null,
  totalEmployees: null, employeesToAssess: null, mobilesRequired: null,
  assessmentDates: null, sites: null, operationalTimes: null, arrivalInfo: null,
  siteCheckinTime: null, accessRequirements: null, parking: null,
  overnightParking: null, plugPoint: null, network: null, wasteDisposal: null,
  services: null, vehicleRequirements: null, hsOfficer: null,
  referralDetails: null, contactOnSite: null, notes: null,
};

export type ExtractResult =
  | { ok: true; fields: WorkOrderFields }
  | { ok: false; reason: 'not_configured' | 'error'; message?: string };

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const bool = (v: unknown): boolean | null => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['yes', 'true', 'y'].includes(s)) return true;
    if (['no', 'false', 'n'].includes(s)) return false;
  }
  return null;
};
const str = (v: unknown): string | null =>
  v === null || v === undefined ? null : String(v).trim() || null;

function normalize(j: Record<string, unknown>): WorkOrderFields {
  return {
    clientName: str(j.clientName),
    skaeContact: str(j.skaeContact),
    clientApproval: bool(j.clientApproval),
    totalEmployees: num(j.totalEmployees),
    employeesToAssess: num(j.employeesToAssess),
    mobilesRequired: num(j.mobilesRequired),
    assessmentDates: str(j.assessmentDates),
    sites: str(j.sites),
    operationalTimes: str(j.operationalTimes),
    arrivalInfo: str(j.arrivalInfo),
    siteCheckinTime: str(j.siteCheckinTime),
    accessRequirements: str(j.accessRequirements),
    parking: bool(j.parking),
    overnightParking: bool(j.overnightParking),
    plugPoint: str(j.plugPoint),
    network: str(j.network),
    wasteDisposal: str(j.wasteDisposal),
    services: str(j.services),
    vehicleRequirements: str(j.vehicleRequirements),
    hsOfficer: str(j.hsOfficer),
    referralDetails: str(j.referralDetails),
    contactOnSite: str(j.contactOnSite),
    notes: str(j.notes),
  };
}

const PROMPT = `Extract fields from this client "Work Order" for a mobile health-services company.
Return ONLY a JSON object (no prose, no markdown) with these keys, using null when absent:
clientName, skaeContact, clientApproval, totalEmployees, employeesToAssess, mobilesRequired,
assessmentDates, sites, operationalTimes, arrivalInfo, siteCheckinTime, accessRequirements,
parking, overnightParking, plugPoint, network, wasteDisposal, services, vehicleRequirements,
hsOfficer, referralDetails, contactOnSite, notes.
clientApproval/parking/overnightParking are booleans; totalEmployees/employeesToAssess/mobilesRequired are numbers; the rest are strings. Do not invent data.`;

export async function extractWorkOrder(
  base64: string,
  mediaType: string,
): Promise<ExtractResult> {
  const client = getAnthropic();
  if (!client) return { ok: false, reason: 'not_configured' };

  const isDocx =
    mediaType === DOCX_MEDIA || mediaType === 'application/msword';

  // Word docs aren't a native content block — unzip to text and send inline.
  let docBlock:
    | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }
    | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/webp'; data: string } }
    | { type: 'text'; text: string };
  if (isDocx) {
    const text = docxToText(Buffer.from(base64, 'base64'));
    if (!text) return { ok: false, reason: 'error', message: 'Could not read the Word document.' };
    docBlock = { type: 'text', text: `WORK ORDER (from Word document):\n\n${text}` };
  } else if (mediaType === 'application/pdf') {
    docBlock = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };
  } else {
    docBlock = { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp', data: base64 } };
  }

  try {
    const res = await client.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: [docBlock, { type: 'text', text: PROMPT }] }],
    });
    const text = res.content
      .map((c) => (c.type === 'text' ? c.text : ''))
      .join('');
    const cleaned = text.replace(/```json|```/g, '').trim();
    const json = JSON.parse(
      cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1),
    ) as Record<string, unknown>;
    return { ok: true, fields: { ...EMPTY, ...normalize(json) } };
  } catch (e) {
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : 'Extraction failed' };
  }
}
