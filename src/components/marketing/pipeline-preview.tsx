import { Briefcase, Send, Radar, Rocket } from 'lucide-react'
import { cn } from '~/lib/utils'
import { m } from '~/lib/paraglide/messages'

/**
 * Aperçu visuel statique du pipeline kanban, affiché dans le hero.
 * Purement décoratif (aria-hidden) : donne à voir le produit sans données réelles.
 * Reproduit le langage visuel du board : colonnes surface-2, cards surface,
 * chips de stage et de type alignées sur le design system.
 */

type TypeKey = 'application' | 'pitch' | 'prospect' | 'mission'

const TYPE_META: Record<
  TypeKey,
  { label: () => string; icon: typeof Briefcase; varName: string }
> = {
  application: {
    label: m.preview_type_application,
    icon: Briefcase,
    varName: '--color-type-application',
  },
  pitch: {
    label: m.preview_type_pitch,
    icon: Send,
    varName: '--color-type-pitch',
  },
  prospect: {
    label: m.preview_type_prospect,
    icon: Radar,
    varName: '--color-type-prospect',
  },
  mission: {
    label: m.preview_type_mission,
    icon: Rocket,
    varName: '--color-type-mission',
  },
}

type Card = {
  title: string
  company: string
  type: TypeKey
  amount: string
}

type Column = {
  label: () => string
  stageVar: string
  softVar: string
  cards: Card[]
}

const COLUMNS: Column[] = [
  {
    label: m.preview_stage_lead,
    stageVar: '--color-stage-lead',
    softVar: '--color-stage-lead-soft',
    cards: [
      {
        title: 'Développeur React senior',
        company: 'Atlas Studio',
        type: 'application',
        amount: '55 000 €',
      },
      {
        title: 'Refonte site vitrine',
        company: 'Coop Karité',
        type: 'prospect',
        amount: '8 500 €',
      },
    ],
  },
  {
    label: m.preview_stage_contacted,
    stageVar: '--color-stage-contacted',
    softVar: '--color-stage-contacted-soft',
    cards: [
      {
        title: 'API paiement mobile',
        company: 'PayWa',
        type: 'pitch',
        amount: '12 000 €',
      },
    ],
  },
  {
    label: m.preview_stage_interview,
    stageVar: '--color-stage-interview',
    softVar: '--color-stage-interview-soft',
    cards: [
      {
        title: 'Lead front-end',
        company: 'Numia',
        type: 'application',
        amount: '62 000 €',
      },
    ],
  },
  {
    label: m.preview_stage_won,
    stageVar: '--color-stage-won',
    softVar: '--color-stage-won-soft',
    cards: [
      {
        title: 'Mission dashboard',
        company: 'Orange CI',
        type: 'mission',
        amount: '18 000 €',
      },
    ],
  },
]

export function PipelinePreview({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-[var(--radius-lg)] border border-border bg-surface p-3 shadow-[var(--shadow-card)] sm:p-4',
        className,
      )}
    >
      <div className="flex gap-3 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {COLUMNS.map((col) => (
          <div
            key={col.stageVar}
            className="flex w-[180px] shrink-0 flex-col gap-2.5 rounded-[var(--radius-lg)] bg-surface-2 p-3"
          >
            <div className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{ background: `var(${col.stageVar})` }}
              />
              <span className="text-xs font-semibold text-fg">
                {col.label()}
              </span>
              <span className="ml-auto text-xs tabular-nums text-fg-subtle">
                {col.cards.length}
              </span>
            </div>

            {col.cards.map((card) => {
              const meta = TYPE_META[card.type]
              const Icon = meta.icon
              return (
                <div
                  key={card.title}
                  className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-surface p-3 shadow-[var(--shadow-card)]"
                >
                  <p className="line-clamp-2 text-[13px] font-medium leading-snug text-fg">
                    {card.title}
                  </p>
                  <p className="text-xs text-fg-subtle">{card.company}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-border px-1.5 py-0.5 text-[11px] font-medium"
                      style={{ color: `var(${meta.varName})` }}
                    >
                      <Icon className="size-3" />
                      {meta.label()}
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums text-fg-muted">
                      {card.amount}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
