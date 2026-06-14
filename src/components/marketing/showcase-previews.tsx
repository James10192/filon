import { PipelinePreview } from '~/components/marketing/pipeline-preview'
import { m } from '~/lib/paraglide/messages'

/**
 * Aperçus des quatre vues du pipeline pour la vitrine (Kanban / Liste / Tableau
 * / Calendrier). Purement décoratifs (aria-hidden via le cadre parent), rendus
 * au SSR. Aucune logique de mouvement ici : le crossfade est géré par le
 * composant de vitrine (opacité CSS).
 */

const ROWS = [
  { title: 'Développeur React senior', company: 'Atlas Studio', stage: m.preview_stage_lead, amount: '55 000 €' },
  { title: 'Refonte site vitrine', company: 'Coop Karité', stage: m.preview_stage_lead, amount: '8 500 €' },
  { title: 'API paiement mobile', company: 'PayWa', stage: m.preview_stage_contacted, amount: '12 000 €' },
  { title: 'Lead front-end', company: 'Numia', stage: m.preview_stage_interview, amount: '62 000 €' },
  { title: 'Mission dashboard', company: 'Orange CI', stage: m.preview_stage_won, amount: '18 000 €' },
] as const

/** Cadre commun : surface, bordure, ombre, coins arrondis. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="size-full overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]">
      {children}
    </div>
  )
}

/** Vue Kanban : contenue dans un scroll horizontal borné (jamais d'overflow page). */
export function KanbanPreview() {
  return (
    <Frame>
      <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
        <PipelinePreview className="min-w-[40rem] border-0 bg-transparent shadow-none" />
      </div>
    </Frame>
  )
}

export function ListPreview() {
  return (
    <Frame>
      <div className="divide-y divide-border">
        {ROWS.map((row) => (
          <div
            key={row.title}
            className="flex items-center gap-3 px-4"
            style={{ height: 'var(--row-h)' }}
          >
            <span className="size-2 shrink-0 rounded-full bg-accent" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-fg">
              {row.title}
            </span>
            <span className="hidden truncate text-xs text-fg-subtle sm:block">
              {row.company}
            </span>
            <span className="rounded-[var(--radius-sm)] border border-border px-2 py-0.5 text-[11px] text-fg-muted">
              {row.stage()}
            </span>
            <span className="assay w-20 text-right text-xs font-semibold text-fg-muted">
              {row.amount}
            </span>
          </div>
        ))}
      </div>
    </Frame>
  )
}

export function TablePreview() {
  return (
    <Frame>
      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full min-w-[28rem] text-left">
          <thead>
            <tr className="border-b border-border text-fg-subtle">
              {[
                m.preview_col_opportunity(),
                m.preview_col_stage(),
                m.preview_col_amount(),
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ROWS.map((row) => (
              <tr key={row.title}>
                <td className="px-4 py-2.5">
                  <p className="truncate text-[13px] font-medium text-fg">
                    {row.title}
                  </p>
                  <p className="truncate text-xs text-fg-subtle">{row.company}</p>
                </td>
                <td className="px-4 py-2.5 text-xs text-fg-muted">{row.stage()}</td>
                <td className="assay px-4 py-2.5 text-xs font-semibold text-fg">
                  {row.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Frame>
  )
}

export function CalendarPreview() {
  const cells = Array.from({ length: 35 }, (_, i) => i)
  const marks: Record<number, string> = {
    4: 'accent',
    9: 'muted',
    16: 'accent',
    23: 'muted',
    28: 'accent',
  }
  return (
    <Frame>
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1.5">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <span
              key={i}
              className="pb-1 text-center text-[10px] font-semibold uppercase text-fg-subtle"
            >
              {d}
            </span>
          ))}
          {cells.map((c) => {
            const mark = marks[c]
            return (
              <div
                key={c}
                className="flex aspect-square flex-col items-center justify-center rounded-[var(--radius-sm)] border border-border bg-bg text-[10px] text-fg-subtle"
              >
                <span className="assay">{c + 1}</span>
                {mark && (
                  <span
                    className="mt-0.5 h-1 w-4 rounded-full"
                    style={{
                      background:
                        mark === 'accent'
                          ? 'var(--color-accent)'
                          : 'var(--color-fg-subtle)',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Frame>
  )
}
