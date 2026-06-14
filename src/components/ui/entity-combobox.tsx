import * as React from 'react'
import { Check, ChevronDown, Loader2, Plus } from 'lucide-react'
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

export type EntityComboboxItem = {
  /** Identifiant de l'entite (ex. Id Convex). */
  value: string
  /** Libelle affiche et recherchable. */
  label: string
}

/**
 * Combobox recherchable avec creation inline.
 *
 * Liste les entites existantes et propose en permanence une action
 * "+ Creer « <recherche> »" qui cree l'entite via `onCreate`, selectionne
 * le nouvel id, et garde le dialog parent ouvert.
 *
 * Generique : ne connait ni l'entite ni la mutation. Le parent fournit les
 * items, le handler de creation, et la valeur controlee.
 */
export function EntityCombobox({
  items,
  value,
  onChange,
  onCreate,
  emptyValue = '__none__',
  emptyLabel,
  placeholder = 'Rechercher...',
  searchPlaceholder = 'Rechercher ou creer...',
  noResultLabel = 'Aucun resultat.',
  createLabel = 'Creer',
  id,
  disabled = false,
}: {
  items: EntityComboboxItem[]
  /** Valeur selectionnee (id de l'entite, ou `emptyValue`). */
  value: string
  onChange: (value: string) => void
  /**
   * Cree une entite a partir du texte saisi et renvoie son id (ou null si echec).
   * Le composant gere l'etat de chargement et la selection automatique.
   */
  onCreate: (name: string) => Promise<string | null>
  /** Valeur sentinelle representant "aucune selection". */
  emptyValue?: string
  /** Libelle de l'option "aucune selection". Si absent, pas d'option vide. */
  emptyLabel?: string
  placeholder?: string
  searchPlaceholder?: string
  noResultLabel?: string
  createLabel?: string
  id?: string
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [creating, setCreating] = React.useState(false)

  const selected = items.find((item) => item.value === value)
  const triggerLabel = selected
    ? selected.label
    : emptyLabel && value === emptyValue
      ? emptyLabel
      : null

  const trimmed = query.trim()
  const alreadyExists = items.some(
    (item) => item.label.toLowerCase() === trimmed.toLowerCase(),
  )
  const canCreate = trimmed.length > 0 && !alreadyExists

  async function handleCreate() {
    if (!canCreate || creating) return
    setCreating(true)
    try {
      const newId = await onCreate(trimmed)
      if (newId) {
        onChange(newId)
        setQuery('')
        setOpen(false)
      }
    } finally {
      setCreating(false)
    }
  }

  function handleSelect(next: string) {
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
            !triggerLabel && 'text-fg-subtle',
          )}
        >
          <span className="truncate">{triggerLabel ?? placeholder}</span>
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
            {!canCreate && <CommandEmpty>{noResultLabel}</CommandEmpty>}
            <CommandGroup>
              {emptyLabel && (
                <CommandItem
                  value={emptyLabel}
                  onSelect={() => handleSelect(emptyValue)}
                >
                  <Check
                    className={cn(
                      'size-4',
                      value === emptyValue ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="text-fg-subtle">{emptyLabel}</span>
                </CommandItem>
              )}
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.label}
                  onSelect={() => handleSelect(item.value)}
                >
                  <Check
                    className={cn(
                      'size-4',
                      value === item.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
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
                    {createLabel} «&nbsp;{trimmed}&nbsp;»
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
