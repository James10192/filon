import { useEffect, useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { Calendar, FileDown, FilePlus2, KanbanSquare, Plus } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import type { GlobalSearchResult } from '../../../convex/search'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '~/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '~/components/ui/dialog'
import { useShortcutLabel } from './use-shortcut-label'
import { NAV_ITEMS } from './nav-config'
import { SearchResults, SearchSkeleton } from './command-search-results'

/**
 * Boite de dialogue de la palette de commandes (cmdk dans un Dialog Radix).
 * Le filtrage cmdk est desactive : on filtre nous-memes les items statiques
 * (accent-insensible) et on rend les resultats Convex tels quels.
 */

/** Normalise (minuscule + sans accents) pour un filtrage tolerant. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

type StaticAction = {
  id: string
  label: string
  keywords: string
  icon: React.ComponentType<{ className?: string }>
  run: () => void
  shortcut?: string
}

export function CommandPaletteDialog({
  isOpen,
  setIsOpen,
  onNavigate,
  onOpenCompany,
  onNewOpportunity,
  onNewProposal,
  onImportOffer,
  onOpenBoard,
  onOpenCalendar,
}: {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onNavigate: (to: string) => void
  onOpenCompany: (name: string) => void
  onNewOpportunity: () => void
  onNewProposal: () => void
  onImportOffer: () => void
  onOpenBoard: () => void
  onOpenCalendar: () => void
}) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const shortcut = useShortcutLabel()

  // Repart d'une saisie vierge a chaque ouverture (input non pre-rempli).
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setDebounced('')
    }
  }, [isOpen])

  // Debounce ~150ms avant d'interroger Convex.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 150)
    return () => clearTimeout(id)
  }, [query])

  // On ne requete que pour un terme non vide ; sinon on ne monte pas la query
  // (jamais d'arg undefined ; pas de requete inutile a vide).
  const results = useQuery(
    api.search.global,
    debounced.length > 0 ? { term: debounced } : 'skip',
  ) as GlobalSearchResult | undefined

  const actions: StaticAction[] = useMemo(
    () => [
      {
        id: 'new-opportunity',
        label: m.command_action_new_opportunity(),
        keywords: 'ajouter creer capture rapide piste candidature',
        icon: Plus,
        run: onNewOpportunity,
        shortcut: 'N',
      },
      {
        id: 'new-proposal',
        label: m.command_action_new_proposal(),
        keywords: 'pitch demarchage prospection creer envoyer',
        icon: FilePlus2,
        run: onNewProposal,
      },
      {
        id: 'import-offer',
        label: m.command_action_import_offer(),
        keywords: 'veille educarriere linkedin lien coller',
        icon: FileDown,
        run: onImportOffer,
      },
      {
        id: 'open-board',
        label: m.command_action_open_board(),
        keywords: 'kanban board colonnes etapes pipeline tableau opportunites',
        icon: KanbanSquare,
        run: onOpenBoard,
      },
      {
        id: 'open-calendar',
        label: m.command_action_open_calendar(),
        keywords: 'agenda echeances relances calendrier dates opportunites',
        icon: Calendar,
        run: onOpenCalendar,
      },
    ],
    [
      onNewOpportunity,
      onNewProposal,
      onImportOffer,
      onOpenBoard,
      onOpenCalendar,
    ],
  )

  const term = normalize(query.trim())
  const visibleActions = term
    ? actions.filter((a) => normalize(`${a.label} ${a.keywords}`).includes(term))
    : actions
  const visiblePages = term
    ? NAV_ITEMS.filter((item) =>
        normalize(`${item.label()} ${item.keywords ?? ''}`).includes(term),
      )
    : NAV_ITEMS

  const searching = debounced.length > 0
  const loadingData = searching && results === undefined

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="top-[18%] translate-y-0 overflow-hidden p-0 sm:max-w-xl [&>button]:right-3 [&>button]:top-2">
        <DialogTitle className="sr-only">{m.command_title()}</DialogTitle>
        <DialogDescription className="sr-only">
          {m.command_description()}
        </DialogDescription>

        <Command
          shouldFilter={false}
          className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5"
        >
          <CommandInput
            className="pr-8"
            placeholder={m.command_input_placeholder()}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-[min(60dvh,420px)] p-2">
            <CommandEmpty className="py-8 text-sm text-fg-subtle">
              {searching ? (
                <>
                  {m.command_empty_with_term()} « {debounced} ».
                </>
              ) : (
                m.command_empty()
              )}
            </CommandEmpty>

            {visibleActions.length > 0 && (
              <CommandGroup heading={m.command_group_actions()}>
                {visibleActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <CommandItem
                      key={action.id}
                      value={`action:${action.id}`}
                      keywords={[action.label, action.keywords]}
                      onSelect={action.run}
                    >
                      <Icon
                        className={
                          action.id === 'new-opportunity' ? 'text-accent' : ''
                        }
                      />
                      <span className="flex-1">{action.label}</span>
                      {action.shortcut && (
                        <CommandShortcut className="assay">
                          {action.shortcut}
                        </CommandShortcut>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}

            {visiblePages.length > 0 && (
              <>
                <CommandSeparator className="my-1" />
                <CommandGroup heading={m.command_group_pages()}>
                  {visiblePages.map((item) => {
                    const Icon = item.icon
                    return (
                      <CommandItem
                        key={item.to}
                        value={`page:${item.to}`}
                        keywords={[item.label(), item.keywords ?? '']}
                        onSelect={() => onNavigate(item.to)}
                      >
                        <Icon />
                        <span className="flex-1">{item.label()}</span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}

            {loadingData && <SearchSkeleton />}

            {searching && results && (
              <SearchResults
                results={results}
                onNavigate={onNavigate}
                onOpenCompany={onOpenCompany}
              />
            )}
          </CommandList>

          <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-fg-subtle">
            <PaletteHint label={m.command_hint_navigate()}>↑↓</PaletteHint>
            <PaletteHint label={m.command_hint_open()}>↵</PaletteHint>
            <PaletteHint label={m.command_hint_close()}>Échap</PaletteHint>
            <kbd className="assay ml-auto rounded border border-border bg-surface-2 px-1.5 py-0.5 text-fg-subtle">
              {shortcut}
            </kbd>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

function PaletteHint({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  return (
    <span className="flex items-center gap-1">
      <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-sans">
        {children}
      </kbd>
      {label}
    </span>
  )
}
