import * as React from 'react'
import { useQuery } from 'convex/react'
import { Check, ChevronDown, Loader2, Tag } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'

/**
 * Filtre multi-sélection par étiquette pour la barre de filtres des
 * opportunités. Liste le catalogue du user (`api.tags.list`) : on FILTRE, on ne
 * crée pas (cohérent avec le vocabulaire d'étiquettes du formulaire, mais sans
 * mutation). La valeur contrôlée est un tableau de noms d'étiquettes.
 *
 * Compact pour s'aligner avec les selects de la toolbar : un seul déclencheur,
 * pas de chips au-dessus (les filtres actifs sont déjà affichés en puces par la
 * toolbar).
 */
export function TagFilter({
  value,
  onChange,
  id,
}: {
  value: string[]
  onChange: (next: string[]) => void
  id?: string
}) {
  const [open, setOpen] = React.useState(false)
  const catalogue = useQuery(api.tags.list, {})

  const options = React.useMemo(() => {
    const seen = new Set<string>()
    const out: { name: string; color?: string }[] = []
    for (const t of catalogue ?? []) {
      const key = t.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ name: t.name, color: t.color })
    }
    // Inclut une étiquette sélectionnée absente du catalogue (cohérence).
    for (const name of value) {
      const key = name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ name })
    }
    return out.sort((a, b) =>
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
    )
  }, [catalogue, value])

  const selectedSet = React.useMemo(
    () => new Set(value.map((v) => v.toLowerCase())),
    [value],
  )

  function toggle(name: string) {
    const key = name.toLowerCase()
    if (selectedSet.has(key)) {
      onChange(value.filter((v) => v.toLowerCase() !== key))
    } else {
      onChange([...value, name])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={m.opp_tag_filter_aria()}
          id={id}
          className="h-11 justify-between gap-2 px-3 font-normal text-fg-subtle lg:h-9 lg:w-44"
        >
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Tag className="size-4 shrink-0 text-fg-subtle" />
            <span className="truncate">
              {value.length > 0
                ? value.length > 1
                  ? m.opp_tag_filter_count_plural({ n: value.length })
                  : m.opp_tag_filter_count_one({ n: value.length })
                : m.opp_tag_filter_label()}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-fg-subtle" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder={m.opp_tag_search_placeholder()} />
          <CommandList>
            {catalogue === undefined ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-fg-subtle">
                <Loader2 className="size-4 animate-spin" />
                {m.opp_loading()}
              </div>
            ) : options.length === 0 ? (
              <CommandEmpty>{m.opp_tag_empty()}</CommandEmpty>
            ) : (
              <>
                <CommandEmpty>{m.opp_tag_no_result()}</CommandEmpty>
                <CommandGroup>
                  {options.map((opt) => {
                    const isSelected = selectedSet.has(opt.name.toLowerCase())
                    return (
                      <CommandItem
                        key={opt.name}
                        value={opt.name}
                        onSelect={() => toggle(opt.name)}
                      >
                        <Check
                          className={cn(
                            'size-4',
                            isSelected ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        {opt.color && (
                          <span
                            aria-hidden
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: opt.color }}
                          />
                        )}
                        <span className="truncate">{opt.name}</span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
