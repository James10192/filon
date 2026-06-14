import * as React from 'react'
import { Check, ChevronDown, Plus } from 'lucide-react'
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
 * Combobox de valeur libre avec suggestions.
 *
 * Pour les champs texte ou un jeu de valeurs courantes existe (secteur,
 * source, localisation) : suggere les valeurs deja utilisees pour la coherence
 * des donnees, tout en laissant saisir n'importe quelle nouvelle valeur via
 * "+ Utiliser « <saisie> »". La valeur EST la chaine (pas d'id).
 */
export function ValueCombobox({
  value,
  onChange,
  suggestions,
  placeholder = 'Choisir ou saisir...',
  searchPlaceholder = 'Saisir une valeur...',
  id,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  /** Valeurs existantes proposees (deduplication faite par le composant). */
  suggestions: string[]
  placeholder?: string
  searchPlaceholder?: string
  id?: string
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')

  const options = React.useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const raw of suggestions) {
      const v = raw.trim()
      if (!v) continue
      const key = v.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(v)
    }
    return out.sort((a, b) => a.localeCompare(b, 'fr'))
  }, [suggestions])

  const trimmed = query.trim()
  const exists = options.some((o) => o.toLowerCase() === trimmed.toLowerCase())
  const canAdd = trimmed.length > 0 && !exists

  function commit(next: string) {
    onChange(next)
    setQuery('')
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          id={id}
          disabled={disabled}
          className={cn(
            'h-11 w-full justify-between gap-2 px-3 font-normal',
            !value && 'text-fg-subtle',
          )}
        >
          <span className="truncate">{value || placeholder}</span>
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
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {!canAdd && options.length === 0 && (
              <CommandEmpty>Saisir une valeur.</CommandEmpty>
            )}
            {options.length > 0 && (
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem key={opt} value={opt} onSelect={() => commit(opt)}>
                    <Check
                      className={cn(
                        'size-4',
                        value === opt ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="truncate">{opt}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {canAdd && (
              <CommandGroup className="border-t border-border">
                <CommandItem
                  value={`__add__${trimmed}`}
                  onSelect={() => commit(trimmed)}
                >
                  <Plus className="size-4" />
                  <span className="truncate">
                    Utiliser «&nbsp;{trimmed}&nbsp;»
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
