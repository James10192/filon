import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { Plus, Target } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Button } from '~/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { PageToolbar } from '~/components/app/page-toolbar'
import { useQuickCapture } from '~/components/app/quick-capture'
import {
  DataTableToolbar,
  DataTableSkeleton,
  DataTableEmpty,
  type FilterChip,
} from '~/components/data-table'
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
    const args: { stage?: Stage; type?: OppType; search?: string } = {}
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

  // Filtre priorite cote client (non porte par le contrat list).
  const visible = useMemo(() => {
    if (!opportunities) return undefined
    if (priority === 'all') return opportunities
    return opportunities.filter((o) => o.priority === priority)
  }, [opportunities, priority])

  // Puces de filtres actifs, retirables individuellement.
  const chips = useMemo<FilterChip[]>(() => {
    const out: FilterChip[] = []
    if (stage !== 'all') {
      out.push({
        key: 'stage',
        label: `Étape : ${STAGE_META[stage].label}`,
        onRemove: () => setStage('all'),
      })
    }
    if (type !== 'all') {
      out.push({
        key: 'type',
        label: `Type : ${TYPE_META[type].label}`,
        onRemove: () => setType('all'),
      })
    }
    if (priority !== 'all') {
      out.push({
        key: 'priority',
        label: `Priorité : ${PRIORITY_META[priority].label}`,
        onRemove: () => setPriority('all'),
      })
    }
    const s = search.trim()
    if (s) {
      out.push({
        key: 'search',
        label: `« ${s} »`,
        onRemove: () => setSearch(''),
      })
    }
    return out
  }, [stage, type, priority, search])

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
        actions={
          <Button onClick={quickCapture.open}>
            <Plus className="size-4" />
            Ajouter
          </Button>
        }
      >
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher une opportunité..."
          searchLabel="Rechercher une opportunité"
          chips={chips}
          onClearAll={resetFilters}
        >
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
        </DataTableToolbar>
      </PageToolbar>

      <Content
        items={visible}
        companyNames={companyNames}
        hasActiveFilters={chips.length > 0}
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
  if (items === undefined) return <DataTableSkeleton />

  if (items.length === 0) {
    if (hasActiveFilters) {
      return (
        <DataTableEmpty
          icon={Target}
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
      <DataTableEmpty
        icon={Target}
        title="Aucune opportunité pour l'instant"
        message="Ajoutez votre première piste pour démarrer le suivi."
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
