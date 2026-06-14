import { Briefcase, Building2, Send } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import type { GlobalSearchResult, SearchHit } from '../../../convex/search'
import {
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '~/components/ui/command'
import { Skeleton } from '~/components/ui/skeleton'

/** Squelette des resultats live pendant l'interrogation Convex (debounce). */
export function SearchSkeleton() {
  return (
    <>
      <CommandSeparator className="my-1" />
      <div className="flex flex-col gap-1.5 px-1 py-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
            <Skeleton className="size-4 shrink-0 rounded-sm" />
            <Skeleton className="h-4 flex-1" style={{ maxWidth: '60%' }} />
          </div>
        ))}
      </div>
    </>
  )
}

/**
 * Rend les resultats de recherche live (Convex) de la palette : opportunites,
 * entreprises, propositions. Chaque groupe ne s'affiche que s'il a des
 * resultats. Entree ouvre la fiche correspondante. Le filtrage est cote
 * serveur (scope par user) : on rend les hits tels quels.
 */
export function SearchResults({
  results,
  onNavigate,
  onOpenCompany,
}: {
  results: GlobalSearchResult
  onNavigate: (to: string) => void
  /** Ouvre la liste entreprises filtree sur le nom (pas de fiche dediee). */
  onOpenCompany: (name: string) => void
}) {
  const hasAny =
    results.opportunities.length > 0 ||
    results.companies.length > 0 ||
    results.proposals.length > 0

  if (!hasAny) return null

  return (
    <>
      <CommandSeparator className="my-1" />

      <ResultGroup
        heading={m.command_results_opportunities()}
        hits={results.opportunities}
        icon={Briefcase}
        keyPrefix="opp"
        onSelect={(hit) => onNavigate(`/app/opportunites/${hit.id}`)}
      />
      <ResultGroup
        heading={m.command_results_companies()}
        hits={results.companies}
        icon={Building2}
        keyPrefix="cmp"
        onSelect={(hit) => onOpenCompany(hit.title)}
      />
      <ResultGroup
        heading={m.command_results_proposals()}
        hits={results.proposals}
        icon={Send}
        keyPrefix="prop"
        onSelect={(hit) => onNavigate(`/app/propositions/${hit.id}`)}
      />
    </>
  )
}

function ResultGroup({
  heading,
  hits,
  icon: Icon,
  keyPrefix,
  onSelect,
}: {
  heading: string
  hits: SearchHit[]
  icon: typeof Briefcase
  keyPrefix: string
  onSelect: (hit: SearchHit) => void
}) {
  if (hits.length === 0) return null

  return (
    <CommandGroup heading={heading}>
      {hits.map((hit) => (
        <CommandItem
          key={`${keyPrefix}:${hit.id}`}
          value={`${keyPrefix}:${hit.id}`}
          onSelect={() => onSelect(hit)}
        >
          <Icon />
          <span className="min-w-0 flex-1 truncate">{hit.title}</span>
          {hit.subtitle && (
            <span className="shrink-0 truncate text-xs text-fg-subtle">
              {hit.subtitle}
            </span>
          )}
        </CommandItem>
      ))}
    </CommandGroup>
  )
}
