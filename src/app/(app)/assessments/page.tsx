import { requireCapability } from '@/services/auth/session';
import { getAssessments } from '@/services/assessments/service';

export default async function AssessmentsPage() {
  await requireCapability('view_assessments');
  const { configured, cards, note } = await getAssessments();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assessments</h1>
        <p className="text-sm text-muted-foreground">Trackers from Metabase</p>
      </div>

      {!configured && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium">Metabase isn&apos;t connected yet.</p>
          <p className="mt-1 text-muted-foreground">
            Add <code>METABASE_BASE_URL</code>, <code>METABASE_API_KEY</code> and{' '}
            <code>METABASE_ASSESSMENT_CARD_IDS</code> to switch this on — then this
            page shows your assessment trackers live.
          </p>
        </div>
      )}

      {note && (
        <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
          {note}
        </div>
      )}

      {cards.map((card) => (
        <section key={card.id} className="space-y-2">
          <h2 className="text-sm font-semibold">{card.name}</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  {card.columns.map((c, i) => (
                    <th key={i} className="px-3 py-2 font-medium text-muted-foreground">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {card.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-border last:border-0">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2">
                        {cell === null ? '—' : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
                {card.rows.length === 0 && (
                  <tr>
                    <td colSpan={card.columns.length} className="px-3 py-2 text-muted-foreground">
                      No rows.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
