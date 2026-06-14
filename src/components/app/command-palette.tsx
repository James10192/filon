import { createContext, useCallback, useContext, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuickCapture } from './quick-capture'
import { CommandPaletteDialog } from './command-dialog'

/**
 * Palette de commandes Cmd+K / Ctrl+K : provider + contexte + hook d'acces.
 * Le rendu (cmdk + recherche Convex) vit dans `command-dialog.tsx`.
 *
 * - Saisie vierge a chaque ouverture (input jamais pre-rempli).
 * - Indexation reelle : pages, actions rapides, et recherche live (Convex)
 *   des opportunites / entreprises / propositions, scopee par utilisateur.
 * - Navigation clavier native (fleches, Entree, Echap).
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
        onOpenCompany={(name) => go('/app/entreprises', { q: name })}
        onNewOpportunity={() => {
          setIsOpen(false)
          quickCapture.open()
        }}
        onNewProposal={() => go('/app/propositions', { nouveau: true })}
        onImportOffer={() => go('/app/veille', { import: true })}
        onOpenBoard={() => go('/app/opportunites', { view: 'tableau' })}
        onOpenCalendar={() => go('/app/opportunites', { view: 'calendrier' })}
      />
    </CommandPaletteContext.Provider>
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
