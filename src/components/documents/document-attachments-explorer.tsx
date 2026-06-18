import { useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import {
  Building2,
  ChevronDown,
  Link2,
  Target,
  User,
  FileSignature,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import { Skeleton } from '~/components/ui/skeleton'
import { m } from '~/lib/paraglide/messages'
import {
  EntityDocuments,
  type DocumentEntityType,
} from '~/components/shared/entity-documents'

const NO_SELECTION = '__none__'

const ENTITY_META: Record<
  DocumentEntityType,
  {
    label: () => string
    icon: typeof Target
    pickPlaceholder: () => string
    searchPlaceholder: () => string
    noResult: () => string
    hintHasItems: () => string
    hintNoItems: () => string
  }
> = {
  opportunity: {
    label: m.carnet_entity_opportunity,
    icon: Target,
    pickPlaceholder: m.carnet_pick_opportunity,
    searchPlaceholder: m.carnet_search_opportunity,
    noResult: m.carnet_no_opportunity_found,
    hintHasItems: m.carnet_hint_opportunity,
    hintNoItems: m.carnet_hint_no_opportunity,
  },
  proposal: {
    label: m.carnet_entity_proposal,
    icon: FileSignature,
    pickPlaceholder: m.carnet_pick_proposal,
    searchPlaceholder: m.carnet_search_proposal,
    noResult: m.carnet_no_proposal_found,
    hintHasItems: m.carnet_hint_proposal,
    hintNoItems: m.carnet_hint_no_proposal,
  },
  company: {
    label: m.carnet_entity_company,
    icon: Building2,
    pickPlaceholder: m.carnet_pick_company,
    searchPlaceholder: m.carnet_search_company,
    noResult: m.carnet_no_company_found,
    hintHasItems: m.carnet_hint_company,
    hintNoItems: m.carnet_hint_no_company,
  },
  contact: {
    label: m.carnet_entity_contact,
    icon: User,
    pickPlaceholder: m.carnet_pick_contact,
    searchPlaceholder: m.carnet_search_contact,
    noResult: m.carnet_no_contact_found,
    hintHasItems: m.carnet_hint_contact,
    hintNoItems: m.carnet_hint_no_contact,
  },
}

const ENTITY_ORDER: DocumentEntityType[] = [
  'opportunity',
  'proposal',
  'company',
  'contact',
]

/**
 * Explorateur des documents par rattachement : on choisit un type d'entite,
 * puis une entite precise, et l'on voit (et gere) les documents qui lui sont
 * relies. Donne du sens a la bibliotheque : chaque document vit en lien avec
 * une opportunite, une proposition, un contact ou une entreprise.
 */
export function DocumentAttachmentsExplorer() {
  const [type, setType] = useState<DocumentEntityType>('opportunity')
  const [entityId, setEntityId] = useState<string>(NO_SELECTION)

  // On charge la liste correspondant au type courant ; les trois autres sont
  // mises en pause (`skip`) pour eviter les souscriptions inutiles.
  const opportunities = useQuery(
    api.opportunities.list,
    type === 'opportunity' ? {} : 'skip',
  )
  const proposals = useQuery(
    api.proposals.list,
    type === 'proposal' ? {} : 'skip',
  )
  const companies = useQuery(api.companies.list, type === 'company' ? {} : 'skip')
  const contacts = useQuery(api.contacts.list, type === 'contact' ? {} : 'skip')

  const items = useMemo(() => {
    switch (type) {
      case 'opportunity':
        return (opportunities ?? []).map((o) => ({
          value: String(o._id),
          label: o.companyName ? `${o.title} · ${o.companyName}` : o.title,
        }))
      case 'proposal':
        return (proposals ?? []).map((p) => ({
          value: String(p._id),
          label: p.companyName ? `${p.title} · ${p.companyName}` : p.title,
        }))
      case 'company':
        return (companies ?? []).map((c) => ({
          value: String(c._id),
          label: c.name,
        }))
      case 'contact':
        return (contacts ?? []).map((c) => {
          const companyName = (c as { companyName?: string }).companyName
          return {
            value: String(c._id),
            label: companyName ? `${c.name} · ${companyName}` : c.name,
          }
        })
    }
  }, [type, opportunities, proposals, companies, contacts])

  const loading =
    (type === 'opportunity' && opportunities === undefined) ||
    (type === 'proposal' && proposals === undefined) ||
    (type === 'company' && companies === undefined) ||
    (type === 'contact' && contacts === undefined)

  const meta = ENTITY_META[type]

  function handleTypeChange(next: DocumentEntityType) {
    setType(next)
    setEntityId(NO_SELECTION)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
        <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-fg">
          <Link2 className="size-4 text-fg-subtle" />
          {m.carnet_explorer_title()}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select
            value={type}
            onValueChange={(v) => handleTypeChange(v as DocumentEntityType)}
          >
            <SelectTrigger
              className="h-11 sm:w-56"
              aria-label={m.carnet_entity_type_aria()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_ORDER.map((t) => {
                const Icon = ENTITY_META[t].icon
                return (
                  <SelectItem key={t} value={t}>
                    <Icon className="size-4 text-fg-subtle" />
                    {ENTITY_META[t].label()}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <div className="flex-1">
            {loading ? (
              <Skeleton className="h-11 w-full" />
            ) : (
              <EntityPicker
                items={items}
                value={entityId}
                onChange={setEntityId}
                placeholder={meta.pickPlaceholder()}
                searchPlaceholder={meta.searchPlaceholder()}
                noResultLabel={meta.noResult()}
              />
            )}
          </div>
        </div>
      </div>

      {entityId === NO_SELECTION ? (
        <ExplorerHint meta={meta} hasItems={items.length > 0} />
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
          <EntityDocuments entityType={type} entityId={entityId} />
        </div>
      )}
    </div>
  )
}

/**
 * Selecteur d'entite recherchable, en lecture seule (pas de creation inline) :
 * on explore l'existant pour voir ses documents rattaches.
 */
function EntityPicker({
  items,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  noResultLabel,
}: {
  items: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  searchPlaceholder: string
  noResultLabel: string
}) {
  const [open, setOpen] = useState(false)
  const selected = items.find((i) => i.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-11 w-full justify-between gap-2 px-3 font-normal',
            !selected && 'text-fg-subtle',
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronDown className="size-4 shrink-0 text-fg-subtle" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{noResultLabel}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.label}
                  onSelect={() => {
                    onChange(item.value)
                    setOpen(false)
                  }}
                >
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** Invite pedagogique quand aucune entite n'est selectionnee. */
function ExplorerHint({
  meta,
  hasItems,
}: {
  meta: (typeof ENTITY_META)[DocumentEntityType]
  hasItems: boolean
}) {
  const Icon = meta.icon
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface-2/40 px-6 py-12 text-center',
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon className="size-5" />
      </span>
      <p className="max-w-md text-sm text-fg-muted">
        {hasItems ? meta.hintHasItems() : meta.hintNoItems()}
      </p>
    </div>
  )
}
