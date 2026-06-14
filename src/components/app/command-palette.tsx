import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useNavigate } from '@tanstack/react-router'
import { FilePlus2, FileDown, Plus } from 'lucide-react'
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
import { useQuickCapture } from './quick-capture'
import { NAV_ITEMS } from './nav-config'

/**
 * Palette de commandes Cmd+K / Ctrl+K, batie sur le composant officiel shadcn
 * Command (cmdk) dans un Dialog Radix.
 *
 * - Recherche tolerante (cmdk gere le scoring + accents via les keywords).
 * - Navigation clavier native (fleches, Entree, Echap).
 * - Actions rapides : nouvelle opportunite (capture rapide), nouvelle
 *   proposition, importer une offre. Plus la navigation vers chaque page.
 *
 * L'API du contexte (open/close/toggle/isOpen) est preservee a l'identique.
 */

type CommandPaletteContextValue = {
  open: () => void
  close: () => void
  toggle: () => void
  isOpen: boolean
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
)

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const quickCapture = useQuickCapture()

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((v) => !v), [])

  function go(to: string, search?: Record<string, unknown>) {
    setIsOpen(false)
    // search construit dynamiquement : aucun champ undefined transmis.
    void navigate(search ? { to, search } : { to })
  }

  return (
    <CommandPaletteContext.Provider value={{ open, close, toggle, isOpen }}>
      {children}
      <CommandPaletteDialog
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        onNavigate={(to) => go(to)}
        onNewOpportunity={() => {
          setIsOpen(false)
          quickCapture.open()
        }}
        onNewProposal={() => go('/app/propositions', { nouveau: true })}
        onImportOffer={() => go('/app/veille', { import: true })}
      />
    </CommandPaletteContext.Provider>
  )
}

function CommandPaletteDialog({
  isOpen,
  setIsOpen,
  onNavigate,
  onNewOpportunity,
  onNewProposal,
  onImportOffer,
}: {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onNavigate: (to: string) => void
  onNewOpportunity: () => void
  onNewProposal: () => void
  onImportOffer: () => void
}) {
  const [query, setQuery] = useState('')

  // Repart d'une saisie vierge a chaque ouverture.
  useEffect(() => {
    if (isOpen) setQuery('')
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="top-[18%] translate-y-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Palette de commandes</DialogTitle>
        <DialogDescription className="sr-only">
          Recherchez une page ou une action. Flèches pour naviguer, Entrée pour
          valider, Échap pour fermer.
        </DialogDescription>

        <Command
          className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5"
          value={query}
          onValueChange={setQuery}
        >
          <CommandInput
            placeholder="Rechercher une page ou une action…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-[min(60dvh,360px)] p-2">
            <CommandEmpty className="py-8 text-sm text-fg-subtle">
              Aucun résultat.
            </CommandEmpty>

            <CommandGroup heading="Actions rapides">
              <CommandItem
                value="nouvelle opportunite ajouter creer capture rapide piste"
                onSelect={onNewOpportunity}
              >
                <Plus className="text-accent" />
                <span className="flex-1">Nouvelle opportunité</span>
                <CommandShortcut className="assay">N</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="nouvelle proposition pitch demarchage prospection creer"
                onSelect={onNewProposal}
              >
                <FilePlus2 />
                <span className="flex-1">Nouvelle proposition</span>
              </CommandItem>
              <CommandItem
                value="importer une offre veille educarriere linkedin lien"
                onSelect={onImportOffer}
              >
                <FileDown />
                <span className="flex-1">Importer une offre</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator className="my-1" />

            <CommandGroup heading="Aller à">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <CommandItem
                    key={item.to}
                    value={`${item.label} ${item.keywords ?? ''}`}
                    onSelect={() => onNavigate(item.to)}
                  >
                    <Icon />
                    <span className="flex-1">{item.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>

          <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-fg-subtle">
            <PaletteHint label="naviguer">↑↓</PaletteHint>
            <PaletteHint label="ouvrir">↵</PaletteHint>
            <PaletteHint label="fermer">Échap</PaletteHint>
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

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext)
  if (!ctx) {
    throw new Error(
      'useCommandPalette doit être utilisé dans un <CommandPaletteProvider>.',
    )
  }
  return ctx
}
