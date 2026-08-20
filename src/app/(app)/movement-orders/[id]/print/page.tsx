import { notFound } from 'next/navigation';
import { requireManager } from '@/services/auth/session';
import { getMovementOrder } from '@/services/movement-orders/service';
import { PrintButton } from '@/features/movement-orders/print-button';

const BOILERPLATE: Array<[string, string]> = [
  ['Travel documents', "Ensure you travel with your ID / driver's license."],
  ['Accreditation', 'Wear your accreditation daily — company uniform, patches and name badges.'],
  ['Driving', "Wear your seat belt, do not speed, be vigilant for potholes and animals. Report any accident/incident to the relevant manager immediately."],
  ['Self-driving safety', 'Adhere to the self-driving policy, including checking in with the appointed staff member on your progress.'],
  ['Smoking', 'No smoking in company vehicles; only in designated areas.'],
  ['Catering', 'Staff supply their own meals unless otherwise specified.'],
  ['Transport & fuel', 'A support vehicle with an allocated driver is provided. If a fuel card is issued, use it for that vehicle only and keep fuel topped up.'],
  ['Alcohol', 'Zero-tolerance policy. Random breathalyser testing may occur without notice.'],
  ['Safety & security', 'Secure all valuables on site; be cautious of smash-and-grab and remote-jamming when parking — confirm doors are locked.'],
  ['Accommodation', 'Book your own accommodation per your allocated LOA. Contact the Operational Manager for emergencies.'],
  ['Receipts', 'Submit receipts for out-of-pocket travel expenses within the stipulated time for reimbursement.'],
];

const dash = (v: string | null) => v || '—';

export default async function MovementOrderPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireManager();
  const { id } = await params;
  const mo = await getMovementOrder(id);
  if (!mo) notFound();

  return (
    <div className="mx-auto max-w-3xl rounded-lg bg-white p-6 text-[13px] text-black shadow print:max-w-none print:p-0 print:shadow-none">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Movement Order</h1>
          <p className="text-neutral-600">{dash(mo.projectName)}</p>
        </div>
        <PrintButton />
      </div>

      <table className="mb-4 w-full border border-neutral-300">
        <tbody>
          {[
            ['Manager', mo.manager],
            ['Region', mo.region],
            ['Reason for travel', mo.reasonForTravel],
            ['MAC (mobile)', mo.macName],
            ['MAC reg', mo.macReg],
            ['Province', mo.province],
            ['Start date', mo.startDate],
            ['Starting point', mo.startingPoint],
          ].map(([k, v]) => (
            <tr key={k} className="border-b border-neutral-200">
              <td className="w-48 bg-neutral-50 px-3 py-1.5 font-medium">{k}</td>
              <td className="px-3 py-1.5">{dash(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {mo.pocContacts.length > 0 && (
        <>
          <h2 className="mb-1 mt-4 font-bold">Contacts</h2>
          <table className="mb-4 w-full border border-neutral-300">
            <tbody>
              {mo.pocContacts.map((c, i) => (
                <tr key={i} className="border-b border-neutral-200">
                  <td className="px-3 py-1.5 text-neutral-600">{c.group}</td>
                  <td className="px-3 py-1.5">{c.role}</td>
                  <td className="px-3 py-1.5 font-medium">{c.name}</td>
                  <td className="px-3 py-1.5">{c.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2 className="mb-1 mt-4 font-bold">Team</h2>
      <table className="mb-4 w-full border border-neutral-300">
        <tbody>
          {mo.team.length === 0 ? (
            <tr><td className="px-3 py-1.5 text-neutral-500">No team selected.</td></tr>
          ) : (
            mo.team.map((t, i) => (
              <tr key={i} className="border-b border-neutral-200">
                <td className="w-48 bg-neutral-50 px-3 py-1.5 font-medium">{t.role}</td>
                <td className="px-3 py-1.5">{t.name}</td>
                <td className="px-3 py-1.5">{t.phone}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h2 className="mb-1 mt-4 font-bold">Movement details</h2>
      <table className="mb-4 w-full border border-neutral-300">
        <thead>
          <tr className="bg-neutral-100 text-left">
            <th className="px-2 py-1.5">Date</th>
            <th className="px-2 py-1.5">From</th>
            <th className="px-2 py-1.5">To</th>
            <th className="px-2 py-1.5">Detail</th>
            <th className="px-2 py-1.5">Notes</th>
          </tr>
        </thead>
        <tbody>
          {mo.legs.length === 0 ? (
            <tr><td colSpan={5} className="px-2 py-1.5 text-neutral-500">No itinerary yet.</td></tr>
          ) : (
            mo.legs.map((l, i) => (
              <tr key={i} className="border-b border-neutral-200 align-top">
                <td className="px-2 py-1.5 whitespace-nowrap">{dash(l.date)}</td>
                <td className="px-2 py-1.5">{l.from}</td>
                <td className="px-2 py-1.5">{l.to}</td>
                <td className="px-2 py-1.5">
                  {l.detail}
                  {l.mapsLink && (
                    <>
                      {' '}
                      <a href={l.mapsLink} className="text-[#0e9f6e] underline">map</a>
                    </>
                  )}
                </td>
                <td className="px-2 py-1.5">{l.notes}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h2 className="mb-1 mt-6 font-bold">Standard information</h2>
      <div className="space-y-1 text-[12px] text-neutral-700">
        {BOILERPLATE.map(([h, t]) => (
          <p key={h}><span className="font-semibold">{h}:</span> {t}</p>
        ))}
        <p className="pt-1 italic">Any accidents / incidents must immediately be reported to the relevant Manager.</p>
      </div>
    </div>
  );
}
