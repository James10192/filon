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
  open: () => void
  close: () => void
  toggle: () => void
  isOpen: boolean
}

const CopilotLauncherContext = createContext<CopilotLauncher | null>(null)

/**
 * Monte le copilote en tiroir (slide-over droite) accessible depuis toute
 * l'application via `useCopilotLauncher` (bouton topbar + raccourci). Le panneau
 * est gaté (accès au palier / crédits) et géré à l'intérieur de `CopilotPanel`.
 */
export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((v) => !v), [])
  const value = useMemo(
    () => ({ open, close, toggle, isOpen }),
    [open, close, toggle, isOpen],
  )

  return (
    <CopilotLauncherContext.Provider value={value}>
      {children}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
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
            <CopilotPanel onNavigate={close} />
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
