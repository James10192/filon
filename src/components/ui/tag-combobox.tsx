import * as React from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Check, ChevronDown, Loader2, Plus, X } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { Badge } from '~/components/ui/badge'
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
 * Combobox multi-selection d'etiquettes.
 *
 * Liste le catalogue d'etiquettes du user (`api.tags.list`) et permet d'en
 * CREER une inline (`api.tags.createTag`, idempotent). La valeur controlee est
 * un tableau de NOMS d'etiquettes (c'est ce que stockent opportunites/contacts).
 *
 * Reutilisable : ne connait que l'API tags. Affiche les etiquettes choisies en
 * chips retirables au-dessus du declencheur.
 */
export function TagCombobox({
  value,
  onChange,
  id,
  disabled = false,
  placeholder,
  searchPlaceholder,
}: {
  /** Noms d'etiquettes selectionnes (source de verite cote parent). */
  value: string[]
  onChange: (next: string[]) => void
  id?: string
  disabled?: boolean
  placeholder?: string
  searchPlaceholder?: string
}) {
  const resolvedPlaceholder = placeholder ?? m.shell_tags_placeholder()
  const resolvedSearchPlaceholder =
    searchPlaceholder ?? m.shell_tags_search_placeholder()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [creating, setCreating] = React.useState(false)
  const catalogue = useQuery(api.tags.list, {})
  const createTag = useMutation(api.tags.createTag)

  // Noms disponibles : catalogue + selection courante (au cas ou un nom choisi
  // ne serait pas encore dans le catalogue local en cours de chargement).
  const options = React.useMemo(() => {
    const seen = new Set<string>()
    const out: { name: string; color?: string }[] = []
    for (const t of catalogue ?? []) {
      const key = t.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ name: t.name, color: t.color })
    }
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

  const trimmed = query.trim()
  const alreadyExists = options.some(
    (o) => o.name.toLowerCase() === trimmed.toLowerCase(),
  )
  const canCreate = trimmed.length > 0 && !alreadyExists

  function toggle(name: string) {
    const key = name.toLowerCase()
    if (selectedSet.has(key)) {
      onChange(value.filter((v) => v.toLowerCase() !== key))
    } else {
      onChange([...value, name])
    }
    setQuery('')
  }

  function removeTag(name: string) {
    const key = name.toLowerCase()
    onChange(value.filter((v) => v.toLowerCase() !== key))
  }

  async function handleCreate() {
    if (!canCreate || creating) return
    setCreating(true)
    try {
      await createTag({ name: trimmed })
      onChange([...value, trimmed])
      setQuery('')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((name) => (
            <Badge key={name} variant="accent" className="gap-1 pr-1">
              <span className="truncate">{name}</span>
              <button
                type="button"
                onClick={() => removeTag(name)}
                disabled={disabled}
                aria-label={m.shell_tags_remove({ name })}
                className="grid size-4 place-items-center rounded-[var(--radius-sm)] text-accent/70 transition-colors hover:bg-accent/15 hover:text-accent"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            id={id}
            disabled={disabled}
            className="h-11 w-full justify-between gap-2 px-3 font-normal text-fg-subtle"
          >
            <span className="truncate">
              {value.length > 0
                ? value.length > 1
                  ? m.shell_tags_count_plural({ n: value.length })
                  : m.shell_tags_count_singular({ n: value.length })
                : resolvedPlaceholder}
            </span>
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
              placeholder={resolvedSearchPlaceholder}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {catalogue === undefined ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-fg-subtle">
                  <Loader2 className="size-4 animate-spin" />
                  {m.shell_loading()}
                </div>
              ) : (
                <>
                  {!canCreate && (
                    <CommandEmpty>{m.shell_tags_empty()}</CommandEmpty>
                  )}
                  {options.length > 0 && (
                    <CommandGroup>
                      {options.map((opt) => {
                        const isSelected = selectedSet.has(
                          opt.name.toLowerCase(),
                        )
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
                  )}
                  {canCreate && (
                    <CommandGroup className="border-t border-border">
                      <CommandItem
                        value={`__create__${trimmed}`}
                        onSelect={handleCreate}
                        disabled={creating}
                      >
                        {creating ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Plus className="size-4" />
                        )}
                        <span className="truncate">
                          {m.shell_tags_create({ name: trimmed })}
                        </span>
                      </CommandItem>
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
