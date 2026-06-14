import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { Building2, Users, FileText, Send, ArrowUpRight } from 'lucide-react'
import { Skeleton } from '~/components/ui/skeleton'
import { formatNumber } from './pipeline-meta'

type Summary = {
  companiesCount: number
  contactsCount: number
  documentsCount: number
  proposalsSent: number
}

type Item = {
  label: string
  value: number
  icon: LucideIcon
  to: string
}

/**
 * Bande « Carnet » : indicateurs de volume du carnet (entreprises, contacts,
 * documents, propositions), discrets et cliquables. Complète la rangée KPI
 * sans la dupliquer. Valeurs en assay-mono.
 */
export function SecondaryKpis({ summary }: { summary: Summary }) {
  const items: Item[] = [
    { label: 'Entreprises', value: summary.companiesCount, icon: Building2, to: '/app/entreprises' },
    { label: 'Contacts', value: summary.contactsCount, icon: Users, to: '/app/entreprises' },
    { label: 'Propositions', value: summary.proposalsSent, icon: Send, to: '/app/propositions' },
    { label: 'Documents', value: summary.documentsCount, icon: FileText, to: '/app/documents' },
  ]

  return (
    <section
      aria-label="Carnet"
      className="reveal grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-border bg-border shadow-[var(--shadow-card)] lg:grid-cols-4"
      style={{ ['--reveal-i' as string]: 7 }}
    >
      {items.map((it) => (
        <CarnetCell key={it.label} {...it} />
      ))}
    </section>
  )
}

function CarnetCell({ label, value, icon: Icon, to }: Item) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-3 bg-surface px-4 py-3.5 transition-colors hover:bg-surface-2"
    >
      <div className="flex items-center gap-2.5">
        <Icon className="size-4 shrink-0 text-fg-subtle" aria-hidden />
        <span className="text-xs font-medium uppercase tracking-[0.04em] text-fg-subtle">
          {label}
        </span>
      </div>
      <span className="flex items-center gap-1.5">
        <span className="assay text-lg font-semibold tracking-[-0.01em] text-fg">
          {formatNumber(value)}
        </span>
        <ArrowUpRight className="size-3.5 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
    </Link>
  )
}

/** Squelette de la bande carnet (état loading). */
export function SecondaryKpisSkeleton() {
  return (
    <section className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-border bg-border shadow-[var(--shadow-card)] lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between bg-surface px-4 py-3.5"
        >
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-8" />
        </div>
      ))}
    </section>
  )
}
