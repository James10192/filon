import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { Sparkles } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '~/components/ui/sheet'
import { CopilotPanel } from './copilot-panel'

type CopilotLauncher = {
  /**
   * Ouvre le tiroir copilote. Avec un `seedPrompt`, le panneau démarre un
   * nouveau fil et pré-remplit la saisie avec ce prompt (l'utilisateur valide
   * l'envoi : zéro consommation surprise de crédits).
   */
  open: (seedPrompt?: string) => void
  /** Ouvre le tiroir directement sur l'onglet « Brief du jour » (copilot_max). */
  openBrief: () => void
  close: () => void
  toggle: () => void
  isOpen: boolean
}

const CopilotLauncherContext = createContext<CopilotLauncher | null>(null)

/**
 * Monte le copilote en tiroir (slide-over droite) accessible depuis toute
 * l'application via `useCopilotLauncher` (bouton topbar + raccourci). Le panneau
 * est gaté (accès au palier / crédits) et géré à l'intérieur de `CopilotPanel`.
 *
 * Un `seedPrompt` peut être injecté depuis n'importe quelle page (bouton
 * « Demander au copilote ») : le tiroir s'ouvre, démarre un nouveau fil et
 * pré-remplit la zone de saisie avec ce prompt contextuel.
 */
export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  // Jeton de seed : un compteur incrémenté garantit qu'un même prompt rejoué
  // re-déclenche bien la pré-saisie (consommé une fois par le panneau).
  const [seed, setSeed] = useState<{ prompt: string; nonce: number } | null>(
    null,
  )
  // Onglet d'ouverture demandé (« brief » pour l'entrée Brief du jour). Remis à
  // null à la fermeture pour que la réouverture standard reparte en conversation.
  const [initialTab, setInitialTab] = useState<'brief' | null>(null)
  const open = useCallback((seedPrompt?: string) => {
    if (seedPrompt && seedPrompt.trim()) {
      setSeed((prev) => ({
        prompt: seedPrompt.trim(),
        nonce: (prev?.nonce ?? 0) + 1,
      }))
    }
    setInitialTab(null)
    setIsOpen(true)
  }, [])
  const openBrief = useCallback(() => {
    setSeed(null)
    setInitialTab('brief')
    setIsOpen(true)
  }, [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((v) => !v), [])
  const value = useMemo(
    () => ({ open, openBrief, close, toggle, isOpen }),
    [open, openBrief, close, toggle, isOpen],
  )

  // À la fermeture, on oublie le seed : le panneau se démonte (Sheet Radix), et
  // une réouverture sans seed (topbar / raccourci) ne doit pas réinjecter le
  // dernier prompt contextuel.
  const onOpenChange = useCallback((next: boolean) => {
    setIsOpen(next)
    if (!next) {
      setSeed(null)
      setInitialTab(null)
    }
  }, [])

  return (
    <CopilotLauncherContext.Provider value={value}>
      {children}
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-xl lg:max-w-2xl"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-border px-4 py-3 text-left">
            <SheetTitle className="flex items-center gap-2 text-base">
              <span className="flex size-6 items-center justify-center rounded-md bg-accent/10 text-accent">
                <Sparkles className="size-3.5" />
              </span>
              {m.copilot_title()}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {m.copilot_subtitle()}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1">
            <CopilotPanel
              onNavigate={close}
              seed={seed}
              initialTab={initialTab ?? undefined}
            />
          </div>
        </SheetContent>
      </Sheet>
    </CopilotLauncherContext.Provider>
  )
}

export function useCopilotLauncher(): CopilotLauncher {
  const ctx = useContext(CopilotLauncherContext)
  if (!ctx) {
    throw new Error(
      'useCopilotLauncher doit être utilisé dans un <CopilotProvider>.',
    )
  }
  return ctx
}
