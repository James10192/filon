import { List, Table2, CalendarDays, KanbanSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PipelinePreview } from '~/components/marketing/pipeline-preview'

/**
 * Vitrine produit pinnée + scrub (cf. use-landing-motion : [data-showcase]).
 * Au scroll, on parcourt les 4 vues du même pipeline (Tableau kanban, Liste,
 * Tableau, Calendrier). La colonne gauche montre la vue active, la droite est
 * un cadre pinné. Tout est rendu statiquement au SSR (1re vue visible) : sans
 * JS la section reste lisible (les panneaux suivants sont juste empilés).
 *
 * Perf : on n'anime que opacity + scale (transform) des panneaux, pas de layout.
 */
export function LandingShowcase() {
  return (
    <section
      id="vues"
      data-showcase
      className="scroll-mt-20 border-t border-border bg-surface"
    >
      <div className="mx-auto grid w-full max-w-screen-xl items-center gap-12 px-4 py-16 md:px-6 md:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8">
        <div className="flex flex-col">
          <p className="eyebrow">Une donnée, quatre angles</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.025em] text-fg md:text-[2.5rem]">
            Le même pipeline, vu comme vous travaillez.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-fg-muted">
            Glissez vos pistes dans le tableau, scannez-les en liste, comparez
            les chiffres en tableau, ou planifiez vos relances au calendrier.
          </p>

          <ol className="mt-10 flex flex-col gap-2">
            {VIEWS.map((view, i) => (
              <li key={view.label}>
                <div
                  data-showcase-view
                  data-active={i === 0 ? 'true' : 'false'}
                  className="group flex items-center gap-4 rounded-[var(--radius)] border border-transparent px-4 py-3 transition-colors data-[active=true]:border-border data-[active=true]:bg-bg"
                >
                  <span className="assay text-xs text-fg-subtle">
                    0{i + 1}
                  </span>
                  <span className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] bg-surface-2 text-fg-muted transition-colors group-data-[active=true]:bg-accent-soft group-data-[active=true]:text-accent">
                    <view.icon className="size-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-fg">
                      {view.label}
                    </p>
                    <p className="text-xs text-fg-subtle">{view.hint}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative min-h-[22rem]">
          <div data-showcase-panel className="absolute inset-0">
            <PipelinePreview />
          </div>
          <div data-showcase-panel className="absolute inset-0">
            <ListPreview />
          </div>
          <div data-showcase-panel className="absolute inset-0">
            <TablePreview />
          </div>
          <div data-showcase-panel className="absolute inset-0">
            <CalendarPreview />
          </div>
        </div>
      </div>
    </section>
  )
}

const VIEWS: { icon: LucideIcon; label: string; hint: string }[] = [
  { icon: KanbanSquare, label: 'Tableau kanban', hint: 'Glisser-déposer par stade' },
  { icon: List, label: 'Liste', hint: 'Scanner et trier rapidement' },
  { icon: Table2, label: 'Tableau', hint: 'Comparer les chiffres' },
  { icon: CalendarDays, label: 'Calendrier', hint: 'Planifier les relances' },
]

const ROWS = [
  { title: 'Développeur React senior', company: 'Atlas Studio', stage: 'Piste', amount: '55 000 €' },
  { title: 'Refonte site vitrine', company: 'Coop Karité', stage: 'Piste', amount: '8 500 €' },
  { title: 'API paiement mobile', company: 'PayWa', stage: 'Contacté', amount: '12 000 €' },
  { title: 'Lead front-end', company: 'Numia', stage: 'Entretien', amount: '62 000 €' },
  { title: 'Mission dashboard', company: 'Orange CI', stage: 'Gagné', amount: '18 000 €' },
] as const

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="size-full overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]">
      {children}
    </div>
  )
}

function ListPreview() {
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
              {row.stage}
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

function TablePreview() {
  return (
    <Frame>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border text-fg-subtle">
            {['Opportunité', 'Stade', 'Montant'].map((h) => (
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
              <td className="px-4 py-2.5 text-xs text-fg-muted">{row.stage}</td>
              <td className="assay px-4 py-2.5 text-xs font-semibold text-fg">
                {row.amount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Frame>
  )
}

function CalendarPreview() {
  const cells = Array.from({ length: 35 }, (_, i) => i)
  const marks: Record<number, string> = { 4: 'accent', 9: 'muted', 16: 'accent', 23: 'muted', 28: 'accent' }
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
