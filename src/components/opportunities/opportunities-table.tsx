import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Coins,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  SquareArrowOutUpRight,
  Trash2,
} from 'lucide-react'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { api } from '../../../convex/_generated/api'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { toast } from '~/components/ui/sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import {
  OpportunityForm,
  type OpportunityFormSubmit,
} from './opportunity-form'
import { OpportunityCard } from './opportunity-card'
import { StageChipSelect } from './stage-chip-select'
import { TypeChip, PriorityChip, DueBadge } from './chips'
import {
  STAGES,
  formatDateShort,
  type Stage,
  type Priority,
} from './meta'

type Opportunity = Doc<'opportunities'>

type SortKey = 'title' | 'stage' | 'priority' | 'deadline'
type SortDir = 'asc' | 'desc'

/** Ordres canoniques pour le tri (etape = pipeline, priorite = low<med<high). */
const STAGE_RANK: Record<Stage, number> = Object.fromEntries(
  STAGES.map((s, i) => [s, i]),
) as Record<Stage, number>
const PRIORITY_RANK: Record<Priority, number> = { low: 0, medium: 1, high: 2 }

const COLUMNS: { key: SortKey; label: string; sortable: true }[] = [
  { key: 'title', label: 'Opportunité', sortable: true },
  { key: 'stage', label: 'Étape', sortable: true },
  { key: 'priority', label: 'Priorité', sortable: true },
  { key: 'deadline', label: 'Échéance', sortable: true },
]

/**
 * Tableau dense des opportunites (style Linear / Attio).
 *
 * - Tri par colonne (titre, etape, priorite, echeance).
 * - Etape = chip cliquable inline (setStage optimiste + toast).
 * - Actions au survol : ouvrir, editer (dialog), supprimer (AlertDialog).
 * - Clic ligne -> detail. Navigation clavier (haut/bas + Entree).
 * - < md : bascule en cartes (le tableau scrolle aussi horizontalement).
 */
export function OpportunitiesTable({
  items,
  companyNames,
}: {
  items: Opportunity[]
  companyNames: Map<string, string>
}) {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SortKey>('title')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [activeIndex, setActiveIndex] = useState(-1)
  const tableRef = useRef<HTMLTableSectionElement>(null)

  const sorted = useMemo(() => {
    const copy = [...items]
    copy.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'title':
          cmp = a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' })
          break
        case 'stage':
          cmp = STAGE_RANK[a.stage] - STAGE_RANK[b.stage]
          break
        case 'priority':
          cmp = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
          break
        case 'deadline': {
          // Sans echeance -> rejete en fin de tri ascendant.
          const av = a.deadline ? new Date(a.deadline).getTime() : Infinity
          const bv = b.deadline ? new Date(b.deadline).getTime() : Infinity
          cmp = av - bv
          break
        }
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [items, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const openDetail = useCallback(
    (id: Id<'opportunities'>) => {
      navigate({ to: '/app/opportunites/$id', params: { id } })
    },
    [navigate],
  )

  // Navigation clavier : fleches haut/bas deplacent la selection, Entree ouvre.
  function handleKeyDown(e: React.KeyboardEvent) {
    if (sorted.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, sorted.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      openDetail(sorted[activeIndex]._id)
    }
  }

  useEffect(() => {
    if (activeIndex < 0 || !tableRef.current) return
    const row = tableRef.current.querySelectorAll('tr')[activeIndex]
    row?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  return (
    <>
      {/* Vue cartes : mobile (< md). */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
        {sorted.map((opportunity) => (
          <OpportunityCard key={opportunity._id} opportunity={opportunity} />
        ))}
      </div>

      {/* Vue tableau dense : >= md (scroll horizontal si etroit). */}
      <div
        className="hidden overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)] md:block"
        // Conteneur focusable pour la navigation clavier de la liste.
        tabIndex={0}
        role="grid"
        aria-label="Tableau des opportunités"
        onKeyDown={handleKeyDown}
      >
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {COLUMNS.map((col) => (
                <SortableHeader
                  key={col.key}
                  label={col.label}
                  active={sortKey === col.key}
                  dir={sortDir}
                  onClick={() => toggleSort(col.key)}
                  className={
                    col.key === 'title'
                      ? 'w-[40%]'
                      : col.key === 'priority'
                        ? 'hidden lg:table-cell'
                        : undefined
                  }
                />
              ))}
              <th className="px-3 py-2.5 text-left">
                <span className="eyebrow">Suivi</span>
              </th>
              <th className="w-12 px-3 py-2.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody ref={tableRef}>
            {sorted.map((opportunity, index) => (
              <Row
                key={opportunity._id}
                opportunity={opportunity}
                companyName={companyNames.get(opportunity.companyId ?? '')}
                active={index === activeIndex}
                onActivate={() => setActiveIndex(index)}
                onOpen={() => openDetail(opportunity._id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
  className?: string
}) {
  return (
    <th className={cn('px-3 py-2.5 text-left', className)}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'eyebrow inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1 py-0.5 transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]',
          active && 'text-fg',
        )}
        aria-label={`Trier par ${label}`}
      >
        {label}
        {active ? (
          dir === 'asc' ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ChevronsUpDown className="size-3 opacity-40" />
        )}
      </button>
    </th>
  )
}

function Row({
  opportunity,
  companyName,
  active,
  onActivate,
  onOpen,
}: {
  opportunity: Opportunity
  companyName?: string
  active: boolean
  onActivate: () => void
  onOpen: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <tr
        role="row"
        aria-selected={active}
        onMouseEnter={onActivate}
        onClick={onOpen}
        className={cn(
          'group cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-surface-2',
          active && 'bg-surface-2',
        )}
      >
        {/* Opportunite : titre + entreprise */}
        <td className="px-3 py-2.5 align-middle">
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2">
              <span className="truncate font-medium text-fg">
                {opportunity.title}
              </span>
              <TypeChip
                type={opportunity.type}
                className="hidden shrink-0 xl:inline-flex"
              />
            </span>
            <span className="truncate text-xs text-fg-subtle">
              {companyName ?? 'Sans entreprise'}
            </span>
          </div>
        </td>

        {/* Etape : chip cliquable */}
        <td className="px-3 py-2.5 align-middle">
          <StageChipSelect
            id={opportunity._id}
            stage={opportunity.stage}
            compact
          />
        </td>

        {/* Priorite */}
        <td className="hidden px-3 py-2.5 align-middle lg:table-cell">
          <PriorityChip priority={opportunity.priority} />
        </td>

        {/* Echeance */}
        <td className="px-3 py-2.5 align-middle text-fg-muted">
          {opportunity.deadline ? (
            <span className="tabular-nums">
              {formatDateShort(opportunity.deadline)}
            </span>
          ) : (
            <span className="text-fg-subtle">·</span>
          )}
        </td>

        {/* Suivi : valeur + lieu + prochaine action */}
        <td className="px-3 py-2.5 align-middle">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
            {opportunity.compensation && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Coins className="size-3.5 text-fg-subtle" />
                {opportunity.compensation}
              </span>
            )}
            {opportunity.location && (
              <span className="inline-flex items-center gap-1 text-fg-subtle">
                <MapPin className="size-3.5" />
                {opportunity.location}
              </span>
            )}
            {opportunity.nextActionAt && (
              <DueBadge date={opportunity.nextActionAt} />
            )}
          </div>
        </td>

        {/* Actions au survol */}
        <td className="px-3 py-2.5 align-middle">
          <RowActions
            opportunity={opportunity}
            onOpen={onOpen}
            onEdit={() => setEditOpen(true)}
          />
        </td>
      </tr>

      <EditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        opportunity={opportunity}
      />
    </>
  )
}

function RowActions({
  opportunity,
  onOpen,
  onEdit,
}: {
  opportunity: Opportunity
  onOpen: () => void
  onEdit: () => void
}) {
  const remove = useMutation(api.opportunities.remove)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  async function handleRemove() {
    setRemoving(true)
    try {
      await remove({ id: opportunity._id })
      toast.success('Opportunité supprimée.')
      setConfirmOpen(false)
    } catch {
      toast.error('La suppression a échoué.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-fg-subtle opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label="Actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onOpen}>
            <SquareArrowOutUpRight className="size-4" />
            Ouvrir
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="size-4" />
            Modifier
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault()
              setConfirmOpen(true)
            }}
          >
            <Trash2 className="size-4" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette opportunité ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La timeline d'activité sera
              également supprimée. Les relances et documents seront détachés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleRemove()
              }}
              disabled={removing}
              className="bg-danger text-white hover:bg-danger/90"
            >
              {removing && <Loader2 className="size-4 animate-spin" />}
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function EditDialog({
  open,
  onOpenChange,
  opportunity,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunity: Opportunity
}) {
  const update = useMutation(api.opportunities.update)
  const [pending, setPending] = useState(false)

  async function handleEdit(values: OpportunityFormSubmit) {
    setPending(true)
    try {
      // update() ne change pas le stage (cf. contrat). Champs definis seulement.
      const args: Record<string, unknown> = {
        id: opportunity._id,
        title: values.title,
        type: values.type,
        tags: values.tags,
        source: values.source ?? '',
        url: values.url ?? '',
        location: values.location ?? '',
        compensation: values.compensation ?? '',
        description: values.description ?? '',
      }
      if (values.deadline) args.deadline = values.deadline
      if (values.nextActionAt) args.nextActionAt = values.nextActionAt
      await update(args as Parameters<typeof update>[0])
      toast.success('Modifications enregistrées.')
      onOpenChange(false)
    } catch {
      toast.error("Les modifications n'ont pas pu être enregistrées.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier l'opportunité</DialogTitle>
          <DialogDescription>
            L'étape se change directement depuis le tableau.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <OpportunityForm
            withStage={false}
            submitLabel="Enregistrer"
            pending={pending}
            onCancel={() => onOpenChange(false)}
            onSubmit={handleEdit}
            initial={{
              title: opportunity.title,
              type: opportunity.type,
              source: opportunity.source,
              url: opportunity.url,
              location: opportunity.location,
              compensation: opportunity.compensation,
              deadline: opportunity.deadline,
              nextActionAt: opportunity.nextActionAt,
              tags: opportunity.tags,
              description: opportunity.description,
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
