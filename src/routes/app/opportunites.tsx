import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { Plus, Search, Target, X } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { PageToolbar } from '~/components/app/page-toolbar'
import { useQuickCapture } from '~/components/app/quick-capture'
import { OpportunitiesTable } from '~/components/opportunities/opportunities-table'
import {
  STAGES,
  STAGE_META,
  TYPE_META,
  PRIORITY_META,
  type OppType,
  type Priority,
  type Stage,
} from '~/components/opportunities/meta'

export const Route = createFileRoute('/app/opportunites')({
  component: OpportunitesPage,
  head: () => ({ meta: [{ title: 'Opportunités · Filon' }] }),
})

type StageFilter = Stage | 'all'
type TypeFilter = OppType | 'all'
type PriorityFilter = Priority | 'all'

const TYPE_OPTIONS = Object.entries(TYPE_META) as [
  OppType,
  (typeof TYPE_META)[OppType],
][]
const PRIORITY_OPTIONS = Object.entries(PRIORITY_META) as [
  Priority,
  (typeof PRIORITY_META)[Priority],
][]

function OpportunitesPage() {
  const quickCapture = useQuickCapture()
  const [stage, setStage] = useState<StageFilter>('all')
  const [type, setType] = useState<TypeFilter>('all')
  const [priority, setPriority] = useState<PriorityFilter>('all')
  const [search, setSearch] = useState('')

  // Filtres construits dynamiquement : jamais `undefined` en arg Convex.
  const queryArgs = useMemo(() => {
    const args: {
      stage?: Stage
      type?: OppType
      search?: string
    } = {}
    if (stage !== 'all') args.stage = stage
    if (type !== 'all') args.type = type
    const s = search.trim()
    if (s.length > 0) args.search = s
    return args
  }, [stage, type, search])

  const opportunities = useQuery(api.opportunities.list, queryArgs)
  const companies = useQuery(api.companies.list, {})

  // Table d'association id -> nom d'entreprise (la liste ne joint pas le nom).
  const companyNames = useMemo(() => {
    const map = new Map<string, string>()
    if (companies) for (const c of companies) map.set(c._id, c.name)
    return map
  }, [companies])

  // Filtre priorité côté client (non porté par le contrat list).
  const visible = useMemo(() => {
    if (!opportunities) return undefined
    if (priority === 'all') return opportunities
    return opportunities.filter((o) => o.priority === priority)
  }, [opportunities, priority])

  const hasActiveFilters =
    stage !== 'all' || type !== 'all' || priority !== 'all' || search.trim() !== ''

  function resetFilters() {
    setStage('all')
    setType('all')
    setPriority('all')
    setSearch('')
  }

  return (
    <div className="flex flex-col">
      <PageToolbar
        title="Opportunités"
        subtitle="Toutes vos pistes, candidatures, propositions et missions."
        sticky
        actions={
          <Button onClick={quickCapture.open}>
            <Plus className="size-4" />
            Ajouter
          </Button>
        }
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative lg:max-w-xs lg:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une opportunité..."
              className="pl-9"
              aria-label="Rechercher une opportunité"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 lg:flex lg:w-auto">
            <Select value={stage} onValueChange={(v) => setStage(v as StageFilter)}>
              <SelectTrigger className="lg:w-40" aria-label="Filtrer par étape">
                <SelectValue placeholder="Étape" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les étapes</SelectItem>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={type} onValueChange={(v) => setType(v as TypeFilter)}>
              <SelectTrigger className="lg:w-36" aria-label="Filtrer par type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {TYPE_OPTIONS.map(([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as PriorityFilter)}
            >
              <SelectTrigger className="lg:w-36" aria-label="Filtrer par priorité">
                <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes priorités</SelectItem>
                {PRIORITY_OPTIONS.map(([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="shrink-0 self-start lg:self-auto"
            >
              <X className="size-4" />
              Réinitialiser
            </Button>
          )}
        </div>
      </PageToolbar>

      <Content
        items={visible}
        companyNames={companyNames}
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
        onCreate={quickCapture.open}
      />
    </div>
  )
}

function Content({
  items,
  companyNames,
  hasActiveFilters,
  onReset,
  onCreate,
}: {
  items: FunctionReturnType<typeof api.opportunities.list> | undefined
  companyNames: Map<string, string>
  hasActiveFilters: boolean
  onReset: () => void
  onCreate: () => void
}) {
  if (items === undefined) return <TableSkeleton />

  if (items.length === 0) {
    if (hasActiveFilters) {
      return (
        <EmptyState
          title="Aucun résultat"
          message="Aucune opportunité ne correspond à ces filtres."
          action={
            <Button variant="outline" onClick={onReset}>
              Réinitialiser les filtres
            </Button>
          }
        />
      )
    }
    return (
      <EmptyState
        title="Aucune opportunité pour l'instant"
        message="Ajoutez votre première piste pour démarrer."
        action={
          <Button onClick={onCreate}>
            <Plus className="size-4" />
            Ajouter une opportunité
          </Button>
        }
      />
    )
  }

  return <OpportunitiesTable items={items} companyNames={companyNames} />
}

function TableSkeleton() {
  return (
    <>
      {/* Cartes mobile */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-4"
          >
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        ))}
      </div>
      {/* Lignes desktop */}
      <div className="hidden overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface md:block">
        <div className="border-b border-border px-3 py-2.5">
          <Skeleton className="h-3 w-24" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border px-3 py-3 last:border-0"
          >
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="hidden h-6 w-16 rounded-md lg:block" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="ml-auto h-6 w-24" />
          </div>
        ))}
      </div>
    </>
  )
}

function EmptyState({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Target className="size-6" />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-fg">{title}</h2>
        <p className="text-sm text-fg-muted">{message}</p>
      </div>
      {action}
    </div>
  )
}
