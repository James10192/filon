import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { Plus, Target } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { TagFilter } from '../tag-filter'
import {
  DataTableToolbar,
  DataTableSkeleton,
  DataTableEmpty,
  type FilterChip,
} from '~/components/data-table'
import { ExportButton } from '~/components/billing/export-button'
import { OPPORTUNITY_COLUMNS } from '~/lib/export'
import { OpportunitiesTable } from '../opportunities-table'
import {
  STAGES,
  TYPE_META,
  typeLabel,
  PRIORITY_META,
  type OppType,
  type Priority,
  type Stage,
} from '../meta'
import { useStageLabels, useLensSet } from '../use-stage-labels'

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

export type ListFilters = {
  stage: StageFilter
  type: TypeFilter
  priority: PriorityFilter
  /** Étiquettes sélectionnées : une opportunité doit les porter TOUTES. */
  tags: string[]
  search: string
}

export const EMPTY_FILTERS: ListFilters = {
  stage: 'all',
  type: 'all',
  priority: 'all',
  tags: [],
  search: '',
}

/**
 * Vue Liste : barre de filtres (recherche + selects + puces actives) au-dessus
 * d'un tableau dense. La sélection ouvre le panneau split (via `onSelect`).
 * L'état des filtres est piloté par le parent pour rester stable au switch de
 * vue.
 */
export function ListView({
  filters,
  onFiltersChange,
  onSelect,
  selectedId,
  onCreate,
  narrow = false,
}: {
  filters: ListFilters
  onFiltersChange: (next: ListFilters) => void
  onSelect: (id: Id<'opportunities'>) => void
  selectedId?: Id<'opportunities'> | null
  onCreate: () => void
  /** Panneau de détail ouvert : zone liste étroite, tableau compact. */
  narrow?: boolean
}) {
  const { stage, type, priority, tags, search } = filters
  const { label: stageLabelOf } = useStageLabels()
  const lensSet = useLensSet()

  const queryArgs = useMemo(() => {
    const args: { stage?: Stage; type?: OppType; search?: string } = {}
    if (stage !== 'all') args.stage = stage
    if (type !== 'all') args.type = type
    const s = search.trim()
    if (s.length > 0) args.search = s
    return args
  }, [stage, type, search])

  const opportunities = useQuery(api.opportunities.list, queryArgs)

  // Filtres secondaires en mémoire : priorité + étiquettes (ET logique, comme
  // le formulaire stocke des noms d'étiquettes normalisés).
  const visible = useMemo(() => {
    if (!opportunities) return undefined
    let rows = opportunities
    if (priority !== 'all') rows = rows.filter((o) => o.priority === priority)
    if (tags.length > 0) {
      rows = rows.filter((o) => tags.every((t) => o.tags.includes(t)))
    }
    return rows
  }, [opportunities, priority, tags])

  const chips = useMemo<FilterChip[]>(() => {
    const out: FilterChip[] = []
    if (stage !== 'all') {
      out.push({
        key: 'stage',
        label: m.opp_chip_stage({ value: stageLabelOf(stage as Stage) }),
        onRemove: () => onFiltersChange({ ...filters, stage: 'all' }),
      })
    }
    if (type !== 'all') {
      out.push({
        key: 'type',
        label: m.opp_chip_type({ value: typeLabel(type, lensSet) }),
        onRemove: () => onFiltersChange({ ...filters, type: 'all' }),
      })
    }
    if (priority !== 'all') {
      out.push({
        key: 'priority',
        label: m.opp_chip_priority({ value: PRIORITY_META[priority].label }),
        onRemove: () => onFiltersChange({ ...filters, priority: 'all' }),
      })
    }
    for (const tag of tags) {
      out.push({
        key: `tag:${tag}`,
        label: m.opp_chip_tag({ value: tag }),
        onRemove: () =>
          onFiltersChange({
            ...filters,
            tags: filters.tags.filter((t) => t !== tag),
          }),
      })
    }
    const s = search.trim()
    if (s) {
      out.push({
        key: 'search',
        label: m.opp_chip_search({ value: s }),
        onRemove: () => onFiltersChange({ ...filters, search: '' }),
      })
    }
    return out
  }, [stage, type, priority, tags, search, filters, onFiltersChange, stageLabelOf])

  const hasActiveFilters = chips.length > 0
  const reset = () => onFiltersChange(EMPTY_FILTERS)

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        search={search}
        onSearchChange={(v) => onFiltersChange({ ...filters, search: v })}
        searchPlaceholder={m.opp_search_placeholder()}
        searchLabel={m.opp_search_label()}
        chips={chips}
        onClearAll={reset}
        actions={
          <ExportButton
            base="opportunites"
            rows={visible ?? []}
            columns={OPPORTUNITY_COLUMNS}
          />
        }
      >
        <Select
          value={stage}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, stage: v as StageFilter })
          }
        >
          <SelectTrigger className="lg:w-40" aria-label={m.opp_filter_stage_aria()}>
            <SelectValue placeholder={m.opp_col_stage()} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{m.opp_filter_all_stages()}</SelectItem>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {stageLabelOf(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={type}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, type: v as TypeFilter })
          }
        >
          <SelectTrigger className="lg:w-36" aria-label={m.opp_filter_type_aria()}>
            <SelectValue placeholder={m.opp_form_type_label()} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{m.opp_filter_all_types()}</SelectItem>
            {TYPE_OPTIONS.map(([key]) => (
              <SelectItem key={key} value={key}>
                {typeLabel(key, lensSet)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={priority}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, priority: v as PriorityFilter })
          }
        >
          <SelectTrigger className="lg:w-36" aria-label={m.opp_filter_priority_aria()}>
            <SelectValue placeholder={m.opp_col_priority()} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{m.opp_filter_all_priorities()}</SelectItem>
            {PRIORITY_OPTIONS.map(([key, meta]) => (
              <SelectItem key={key} value={key}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <TagFilter
          value={tags}
          onChange={(next) => onFiltersChange({ ...filters, tags: next })}
        />
      </DataTableToolbar>

      {visible === undefined ? (
        <DataTableSkeleton />
      ) : visible.length === 0 ? (
        hasActiveFilters ? (
          <DataTableEmpty
            icon={Target}
            title={m.opp_empty_filtered_title()}
            message={m.opp_empty_filtered_message()}
            action={
              <Button variant="outline" onClick={reset}>
                {m.opp_reset_filters()}
              </Button>
            }
          />
        ) : (
          <DataTableEmpty
            icon={Target}
            title={m.opp_empty_title()}
            message={m.opp_empty_message()}
            action={
              <Button onClick={onCreate}>
                <Plus className="size-4" />
                {m.opp_add_opportunity()}
              </Button>
            }
          />
        )
      ) : (
        <OpportunitiesTable
          items={visible}
          onSelect={onSelect}
          selectedId={selectedId}
          narrow={narrow}
        />
      )}
    </div>
  )
}
