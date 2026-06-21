import type { LucideIcon } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { CopilotOppCard, type CopilotOpp } from '../copilot-opp-card'

/**
 * Primitives partagées des widgets « generative UI » du copilote (carte, en-tête,
 * indice de vide, listes génériques et liste de cartes d'opportunité). Factorisées
 * ici pour que chaque widget de domaine les compose au lieu de les redupliquer.
 */

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="not-prose overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow-sm)]">
      {children}
    </div>
  )
}

export function EmptyHint({ text }: { text: string }) {
  return <p className="px-3.5 py-3 text-sm text-fg-muted">{text}</p>
}

export function Header({ icon: Icon, label }: { icon?: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3.5 py-2">
      {Icon && <Icon className="size-3.5 text-accent" />}
      <span className="text-xs font-medium text-fg-muted">{label}</span>
    </div>
  )
}

function MoreHint({ hidden }: { hidden: number }) {
  if (hidden <= 0) return null
  return (
    <p className="border-t border-border px-3.5 py-2 text-xs text-fg-subtle">
      {hidden > 1
        ? m.app_tool_more_plural({ n: hidden })
        : m.app_tool_more_singular({ n: hidden })}
    </p>
  )
}

/** Liste de cartes d'opportunité (rendu riche, navigation vers la fiche). */
export function OppList({
  items,
  onNavigate,
  label,
  empty,
  icon,
  limit = 8,
}: {
  items: CopilotOpp[]
  onNavigate?: () => void
  label: (count: number) => string
  empty: string
  icon?: LucideIcon
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
      <Header icon={icon} label={label(items.length)} />
      <ul className="divide-y divide-border">
        {shown.map((o) => (
          <li key={o.id}>
            <CopilotOppCard opp={o} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
      <MoreHint hidden={items.length - shown.length} />
    </Card>
  )
}

/** Liste générique (en-tête optionnel + ligne personnalisée par item). */
export function List<T extends { id: string }>({
  items,
  row,
  empty,
  icon,
  count,
  limit = 8,
}: {
  items: T[]
  row: (item: T) => React.ReactNode
  empty: string
  icon?: LucideIcon
  count?: (n: number) => string
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
      {icon && count && <Header icon={icon} label={count(items.length)} />}
      <ul className="divide-y divide-border">
        {shown.map((item) => (
          <li key={item.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
            {row(item)}
          </li>
        ))}
      </ul>
      <MoreHint hidden={items.length - shown.length} />
    </Card>
  )
}
