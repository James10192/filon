import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Plus, Radar } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import { toast } from '~/components/ui/sonner'
import { handlePlanLimit } from '~/lib/billing/upsell'
import { SavedSearchRow } from './saved-search-row'

/** Découpe une saisie « développeur, react, laravel » en mots-clés propres. */
function splitKeywords(input: string): string[] {
  return input
    .split(/[,\n]/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
}

/**
 * Gestion des recherches surveillées par le moniteur educarriere. États gérés :
 * chargement (skeletons), vide (état illustré + CTA), succès (liste). Ajout de
 * mots-clés via une saisie séparée par des virgules.
 */
export function SavedSearchManager() {
  const searches = useQuery(api.savedSearches.list, {})
  const create = useMutation(api.savedSearches.create)
  const [draft, setDraft] = useState('')
  const [creating, setCreating] = useState(false)

  async function addSearch() {
    const keywords = splitKeywords(draft)
    if (keywords.length === 0) {
      toast.error('Ajoutez au moins un mot-clé.')
      return
    }
    setCreating(true)
    try {
      await create({ keywords })
      toast.success('Recherche enregistrée. Le moniteur la surveillera.')
      setDraft('')
    } catch (error) {
      if (!handlePlanLimit(error)) {
        toast.error("L'enregistrement a échoué.")
      }
    } finally {
      setCreating(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void addSearch()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
            <Radar className="size-4" />
          </span>
          Surveillance educarriere
        </CardTitle>
        <CardDescription>
          Le moniteur analyse les nouvelles offres educarriere toutes les 6
          heures et ajoute automatiquement celles qui correspondent à vos
          mots-clés. Les doublons sont écartés.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="développeur, react, laravel"
            aria-label="Mots-clés à surveiller"
            disabled={creating}
          />
          <Button
            onClick={addSearch}
            disabled={creating || draft.trim().length === 0}
            className="shrink-0"
          >
            <Plus className="size-4" />
            Ajouter
          </Button>
        </div>

        <SearchList searches={searches} />
      </CardContent>
    </Card>
  )
}

function SearchList({
  searches,
}: {
  searches: ReturnType<typeof useQuery<typeof api.savedSearches.list>>
}) {
  if (searches === undefined) {
    return (
      <div className="overflow-hidden rounded-[var(--radius)] border border-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-border px-4 py-3.5 last:border-0"
          >
            <div className="space-y-2">
              <Skeleton className="h-6 w-40 rounded-full" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="h-11 w-24" />
          </div>
        ))}
      </div>
    )
  }

  if (searches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-dashed border-border px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Radar className="size-6" />
        </span>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-fg">
            Aucune recherche enregistrée
          </h3>
          <p className="text-sm text-fg-muted">
            Ajoutez des mots-clés comme « développeur, react, laravel » pour que
            Filon surveille educarriere à votre place.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-border">
      {searches.map((search) => (
        <SavedSearchRow key={search._id} search={search} />
      ))}
    </div>
  )
}
