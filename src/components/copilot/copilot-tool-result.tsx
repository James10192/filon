import {
  Briefcase,
  BellRing,
  Send,
  Building2,
  User,
  TrendingUp,
} from 'lucide-react'
import { ProgressBar } from '~/components/ui/progress-bar'

/**
 * Rendu riche (generative UI) des résultats d'outils du copilote : au lieu d'un
 * JSON brut, on affiche de vrais composants (tuiles de stats, barres, listes
 * premium). Renvoie `null` si l'outil n'a pas de rendu dédié (fallback générique
 * géré par l'appelant).
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
      return <OpportunityList items={output as OppItem[]} />
    case 'due_followups':
      return <FollowupList items={output as FollowupItem[]} />
    case 'list_proposals':
      return <ProposalList items={output as ProposalItem[]} />
    case 'find_company':
      return <CompanyList items={output as CompanyItem[]} />
    case 'find_contact':
      return <ContactList items={output as ContactItem[]} />
    default:
      return null
  }
}

const STAGE_LABELS: Record<string, string> = {
  lead: 'Pistes',
  contacted: 'Contactés',
  applied: 'Candidatures',
  interview: 'Entretiens',
  negotiation: 'Négociation',
  won: 'Gagnées',
  lost: 'Perdues',
}

const STAGE_ORDER = [
  'lead',
  'contacted',
  'applied',
  'interview',
  'negotiation',
  'won',
  'lost',
]

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

// --- Pipeline -------------------------------------------------------------

type PipelineData = {
  total: number
  active: number
  won: number
  byStage: Record<string, number>
}

function PipelineSummary({ data }: { data: PipelineData }) {
  const max = Math.max(1, ...Object.values(data.byStage ?? {}))
  const stages = STAGE_ORDER.filter((s) => (data.byStage?.[s] ?? 0) > 0)
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
                <span className="w-24 shrink-0 text-xs text-fg-muted">
                  {STAGE_LABELS[s] ?? s}
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

// --- Lists ----------------------------------------------------------------

type OppItem = { id: string; title: string; stage: string; priority: string }

function OpportunityList({ items }: { items: OppItem[] }) {
  if (!items?.length) return <Card><EmptyHint text="Aucune opportunité trouvée." /></Card>
  return (
    <Card>
      <Header icon={Briefcase} label={`${items.length} opportunité${items.length > 1 ? 's' : ''}`} />
      <ul className="divide-y divide-border">
        {items.slice(0, 8).map((o) => (
          <li key={o.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
            <span
              className={`size-1.5 shrink-0 rounded-full ${o.priority === 'high' ? 'bg-danger' : o.priority === 'low' ? 'bg-fg-subtle' : 'bg-warning'}`}
            />
            <span className="min-w-0 flex-1 truncate text-sm text-fg">
              {o.title}
            </span>
            <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-fg-muted">
              {STAGE_LABELS[o.stage] ?? o.stage}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

type FollowupItem = { id: string; label: string; dueDate: string }

function FollowupList({ items }: { items: FollowupItem[] }) {
  if (!items?.length) return <Card><EmptyHint text="Aucune relance à venir. Tu es à jour." /></Card>
  return (
    <Card>
      <Header icon={BellRing} label={`${items.length} relance${items.length > 1 ? 's' : ''}`} />
      <ul className="divide-y divide-border">
        {items.slice(0, 8).map((f) => (
          <li key={f.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
            <span className="min-w-0 flex-1 truncate text-sm text-fg">
              {f.label}
            </span>
            <span className="assay shrink-0 text-xs text-fg-muted">
              {formatDate(f.dueDate)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

type ProposalItem = {
  id: string
  title: string
  status: string
  amount: number | null
  currency: string
}

const PROPOSAL_STATUS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  accepted: 'Acceptée',
  refused: 'Refusée',
}

function ProposalList({ items }: { items: ProposalItem[] }) {
  if (!items?.length) return <Card><EmptyHint text="Aucune proposition." /></Card>
  return (
    <Card>
      <Header icon={Send} label={`${items.length} proposition${items.length > 1 ? 's' : ''}`} />
      <ul className="divide-y divide-border">
        {items.slice(0, 8).map((p) => (
          <li key={p.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
            <span className="min-w-0 flex-1 truncate text-sm text-fg">
              {p.title}
            </span>
            {p.amount != null && (
              <span className="assay shrink-0 text-xs text-fg-muted">
                {p.amount.toLocaleString('fr-FR')} {p.currency}
              </span>
            )}
            <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-fg-muted">
              {PROPOSAL_STATUS[p.status] ?? p.status}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

type CompanyItem = { id: string; name: string; sector: string | null }

function CompanyList({ items }: { items: CompanyItem[] }) {
  if (!items?.length) return <Card><EmptyHint text="Aucune entreprise trouvée." /></Card>
  return (
    <Card>
      <ul className="divide-y divide-border">
        {items.map((c) => (
          <li key={c.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
            <Building2 className="size-4 shrink-0 text-fg-subtle" />
            <span className="min-w-0 flex-1 truncate text-sm text-fg">{c.name}</span>
            {c.sector && (
              <span className="shrink-0 text-xs text-fg-muted">{c.sector}</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

type ContactItem = { id: string; name: string; role: string | null }

function ContactList({ items }: { items: ContactItem[] }) {
  if (!items?.length) return <Card><EmptyHint text="Aucun contact trouvé." /></Card>
  return (
    <Card>
      <ul className="divide-y divide-border">
        {items.map((c) => (
          <li key={c.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
            <User className="size-4 shrink-0 text-fg-subtle" />
            <span className="min-w-0 flex-1 truncate text-sm text-fg">{c.name}</span>
            {c.role && (
              <span className="shrink-0 text-xs text-fg-muted">{c.role}</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

// --- Shared ---------------------------------------------------------------

function Header({
  icon: Icon,
  label,
}: {
  icon: typeof TrendingUp
  label: string
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3.5 py-2">
      <Icon className="size-3.5 text-accent" />
      <span className="text-xs font-medium text-fg-muted">{label}</span>
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
