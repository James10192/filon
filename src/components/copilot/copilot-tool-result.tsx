import {
  Briefcase,
  BellRing,
  Send,
  Building2,
  User,
  type LucideIcon,
} from 'lucide-react'
import { ProgressBar } from '~/components/ui/progress-bar'
import { Badge } from '~/components/ui/badge'
import { STAGE_META, STAGES } from '~/components/opportunities/meta'
import {
  STATUS_LABELS,
  STATUS_BADGE,
  formatAmount,
} from '~/components/proposals/proposal-status'

/**
 * Rendu riche (generative UI) des résultats d'outils du copilote : au lieu d'un
 * JSON brut, on affiche de vrais composants (tuiles de stats, barres, listes
 * premium), en réutilisant les libellés/couleurs canoniques de l'app. Renvoie
 * `null` si l'outil n'a pas de rendu dédié (fallback générique géré par
 * l'appelant).
 */
export function renderToolResult(
  tool: string,
  output: unknown,
): React.ReactNode {
  if (output == null || typeof output !== 'object') return null
  switch (tool) {
    case 'summarize_pipeline':
    case 'pipeline_stats':
      return <PipelineSummary data={output as PipelineData} />
    case 'list_opportunities':
    case 'search_opportunities':
      return (
        <List
          items={output as OppItem[]}
          icon={Briefcase}
          noun="opportunité"
          empty="Aucune opportunité trouvée."
          row={(o) => (
            <>
              <span className="min-w-0 flex-1 truncate text-sm text-fg">
                {o.title}
              </span>
              <Badge variant="outline" className={stageChip(o.stage)}>
                {stageLabel(o.stage)}
              </Badge>
            </>
          )}
        />
      )
    case 'due_followups':
      return (
        <List
          items={output as FollowupItem[]}
          icon={BellRing}
          noun="relance"
          empty="Aucune relance à venir. Tu es à jour."
          row={(f) => (
            <>
              <span className="min-w-0 flex-1 truncate text-sm text-fg">
                {f.label}
              </span>
              <span className="assay shrink-0 text-xs text-fg-muted">
                {formatDate(f.dueDate)}
              </span>
            </>
          )}
        />
      )
    case 'list_proposals':
      return (
        <List
          items={output as ProposalItem[]}
          icon={Send}
          noun="proposition"
          empty="Aucune proposition."
          row={(p) => (
            <>
              <span className="min-w-0 flex-1 truncate text-sm text-fg">
                {p.title}
              </span>
              {p.amount != null && (
                <span className="assay shrink-0 text-xs text-fg-muted">
                  {formatAmount(p.amount, p.currency)}
                </span>
              )}
              <Badge variant={STATUS_BADGE[p.status] ?? 'outline'}>
                {STATUS_LABELS[p.status] ?? p.status}
              </Badge>
            </>
          )}
        />
      )
    case 'find_company':
      return (
        <List
          items={output as CompanyItem[]}
          empty="Aucune entreprise trouvée."
          row={(c) => (
            <>
              <Building2 className="size-4 shrink-0 text-fg-subtle" />
              <span className="min-w-0 flex-1 truncate text-sm text-fg">
                {c.name}
              </span>
              {c.sector && (
                <span className="shrink-0 text-xs text-fg-muted">{c.sector}</span>
              )}
            </>
          )}
        />
      )
    case 'find_contact':
      return (
        <List
          items={output as ContactItem[]}
          empty="Aucun contact trouvé."
          row={(c) => (
            <>
              <User className="size-4 shrink-0 text-fg-subtle" />
              <span className="min-w-0 flex-1 truncate text-sm text-fg">
                {c.name}
              </span>
              {c.role && (
                <span className="shrink-0 text-xs text-fg-muted">{c.role}</span>
              )}
            </>
          )}
        />
      )
    default:
      return null
  }
}

// --- Libellés canoniques (réutilisés de l'app, jamais de codes bruts) ------

function stageLabel(stage: string): string {
  return STAGE_META[stage as keyof typeof STAGE_META]?.label ?? stage
}
function stageChip(stage: string): string {
  return STAGE_META[stage as keyof typeof STAGE_META]?.chip ?? ''
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="not-prose overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow-sm)]">
      {children}
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return <p className="px-3.5 py-3 text-sm text-fg-muted">{text}</p>
}

function Header({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3.5 py-2">
      <Icon className="size-3.5 text-accent" />
      <span className="text-xs font-medium text-fg-muted">{label}</span>
    </div>
  )
}

// --- Liste générique -------------------------------------------------------

function List<T extends { id: string }>({
  items,
  row,
  empty,
  icon,
  noun,
  limit = 8,
}: {
  items: T[]
  row: (item: T) => React.ReactNode
  empty: string
  icon?: LucideIcon
  noun?: string
  limit?: number
}) {
  if (!items?.length) {
    return (
      <Card>
        <EmptyHint text={empty} />
      </Card>
    )
  }
  const shown = items.slice(0, limit)
  return (
    <Card>
      {icon && noun && (
        <Header
          icon={icon}
          label={`${items.length} ${noun}${items.length > 1 ? 's' : ''}`}
        />
      )}
      <ul className="divide-y divide-border">
        {shown.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-2.5 px-3.5 py-2.5"
          >
            {row(item)}
          </li>
        ))}
      </ul>
    </Card>
  )
}

// --- Pipeline --------------------------------------------------------------

type PipelineData = {
  total: number
  active: number
  won: number
  byStage: Record<string, number>
}

function PipelineSummary({ data }: { data: PipelineData }) {
  const max = Math.max(1, ...Object.values(data.byStage ?? {}))
  const stages = STAGES.filter((s) => (data.byStage?.[s] ?? 0) > 0)
  return (
    <Card>
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <Stat label="Total" value={data.total} />
        <Stat label="Actives" value={data.active} />
        <Stat label="Gagnées" value={data.won} accent />
      </div>
      {data.total === 0 ? (
        <EmptyHint text="Pipeline vide pour le moment. Demande au copilote de créer une opportunité." />
      ) : (
        <div className="space-y-2 p-3.5">
          {stages.map((s) => {
            const n = data.byStage[s] ?? 0
            return (
              <div key={s} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-xs text-fg-muted">
                  {STAGE_META[s].label}
                </span>
                <ProgressBar
                  percent={(n / max) * 100}
                  className="flex-1"
                  barClassName={s === 'won' ? 'bg-success' : 'bg-accent'}
                />
                <span className="assay w-6 shrink-0 text-right text-xs font-medium text-fg">
                  {n}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-3">
      <span
        className={`assay text-xl font-semibold ${accent ? 'text-success' : 'text-fg'}`}
      >
        {value}
      </span>
      <span className="text-[11px] uppercase tracking-wide text-fg-subtle">
        {label}
      </span>
    </div>
  )
}

// --- Types & utils ---------------------------------------------------------

type OppItem = { id: string; title: string; stage: string; priority: string }
type FollowupItem = { id: string; label: string; dueDate: string }
type ProposalItem = {
  id: string
  title: string
  status: keyof typeof STATUS_LABELS
  amount: number | null
  currency: string
}
type CompanyItem = { id: string; name: string; sector: string | null }
type ContactItem = { id: string; name: string; role: string | null }

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
