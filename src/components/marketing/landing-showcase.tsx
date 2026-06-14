import { List, Table2, CalendarDays, KanbanSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useShowcaseTabs } from '~/components/marketing/use-showcase-tabs'
import {
  KanbanPreview,
  ListPreview,
  TablePreview,
  CalendarPreview,
} from '~/components/marketing/showcase-previews'

/**
 * Vitrine produit : sélecteur de vues interactif (PAS de pin/sticky ScrollTrigger,
 * qui entrait en conflit avec ScrollSmoother — zone morte sur mobile, recouvrement
 * sur desktop).
 *
 * À gauche (desktop) / au-dessus (mobile), une rangée d'onglets numérotés (assay
 * 01–04). À droite / en dessous, un cadre d'aperçu qui montre la vue active. Le
 * clic bascule la vue ; un crossfade en pure opacité CSS (transform/opacity
 * uniquement, zéro layout) anime la transition. Auto-avance discret, en pause dès
 * la première interaction. Tout est rendu au SSR (1re vue visible, lisible sans JS).
 *
 * La section se révèle au scroll via le pattern [data-reveal] partagé. Aucune
 * zone morte, aucun recouvrement, comportement identique mobile/desktop.
 */
export function LandingShowcase() {
  const { active, select } = useShowcaseTabs(VIEWS.length)

  return (
    <section
      id="vues"
      className="scroll-mt-20 border-t border-border bg-surface"
    >
      <div className="mx-auto grid w-full max-w-screen-xl gap-10 px-4 py-20 md:px-6 md:py-28 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16 lg:px-8">
        <div className="flex flex-col">
          <p data-reveal className="eyebrow">
            Une donnée, quatre angles
          </p>
          <h2
            data-reveal
            className="mt-3 text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.025em] text-fg md:text-[2.5rem]"
          >
            Le même pipeline, vu comme vous travaillez.
          </h2>
          <p
            data-reveal
            className="mt-4 max-w-md text-base leading-relaxed text-fg-muted"
          >
            Glissez vos pistes dans le tableau, scannez-les en liste, comparez
            les chiffres en tableau, ou planifiez vos relances au calendrier.
          </p>

          {/* Onglets : liste verticale sur desktop, scroll horizontal sur mobile. */}
          <div
            data-reveal
            role="tablist"
            aria-label="Choisir une vue du pipeline"
            className="mt-10 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-col lg:overflow-visible [&::-webkit-scrollbar]:hidden"
          >
            {VIEWS.map((view, i) => {
              const isActive = i === active
              const Icon = view.icon
              return (
                <button
                  key={view.label}
                  type="button"
                  role="tab"
                  id={`showcase-tab-${i}`}
                  aria-selected={isActive}
                  aria-controls="showcase-panel"
                  data-active={isActive}
                  onClick={() => select(i)}
                  className="group flex min-h-11 shrink-0 items-center gap-3 rounded-[var(--radius)] border border-transparent px-4 py-3 text-left transition-colors hover:bg-bg data-[active=true]:border-border data-[active=true]:bg-bg lg:w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]"
                >
                  <span className="assay text-xs text-fg-subtle">0{i + 1}</span>
                  <span className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] bg-surface-2 text-fg-muted transition-colors group-hover:text-fg group-data-[active=true]:bg-accent-soft group-data-[active=true]:text-accent">
                    <Icon className="size-4.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-fg">
                      {view.label}
                    </span>
                    <span className="hidden text-xs text-fg-subtle sm:block">
                      {view.hint}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Cadre d'aperçu : panneaux empilés en absolu, crossfade par opacité. */}
        <div
          data-reveal
          id="showcase-panel"
          role="tabpanel"
          aria-labelledby={`showcase-tab-${active}`}
          className="relative min-h-[20rem] sm:min-h-[22rem]"
        >
          {VIEWS.map((view, i) => {
            const Preview = view.preview
            const isActive = i === active
            return (
              <div
                key={view.label}
                aria-hidden={!isActive}
                className="absolute inset-0 transition-opacity duration-500 ease-out motion-reduce:transition-none"
                style={{
                  opacity: isActive ? 1 : 0,
                  pointerEvents: isActive ? 'auto' : 'none',
                }}
              >
                <Preview />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const VIEWS: {
  icon: LucideIcon
  label: string
  hint: string
  preview: () => React.JSX.Element
}[] = [
  {
    icon: KanbanSquare,
    label: 'Tableau kanban',
    hint: 'Glisser-déposer par stade',
    preview: KanbanPreview,
  },
  {
    icon: List,
    label: 'Liste',
    hint: 'Scanner et trier rapidement',
    preview: ListPreview,
  },
  {
    icon: Table2,
    label: 'Tableau',
    hint: 'Comparer les chiffres',
    preview: TablePreview,
  },
  {
    icon: CalendarDays,
    label: 'Calendrier',
    hint: 'Planifier les relances',
    preview: CalendarPreview,
  },
]
