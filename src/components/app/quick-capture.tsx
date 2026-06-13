import { createContext, useCallback, useContext, useState } from 'react'
import { useMutation } from 'convex/react'
import { Zap } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { toast } from '~/components/ui/sonner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
import {
  OpportunityForm,
  type OpportunityFormSubmit,
} from '~/components/opportunities/opportunity-form'

/**
 * Capture rapide d'une opportunite, ouvrable depuis n'importe ou (topbar,
 * palette de commandes, raccourci clavier "n").
 *
 * Reutilise le formulaire opportunite existant (meme champs, meme validation)
 * et appelle `api.opportunities.create`, exactement comme le dialog de la page
 * Opportunites. Monte un Sheet lateral, plus adapte qu'un dialog pour une
 * action globale repetee.
 *
 * Usage :
 *   <QuickCaptureProvider>...</QuickCaptureProvider>  // au niveau du shell
 *   const { open } = useQuickCapture()                // n'importe ou dessous
 */

type QuickCaptureContextValue = {
  open: () => void
  close: () => void
  isOpen: boolean
}

const QuickCaptureContext = createContext<QuickCaptureContextValue | null>(null)

export function QuickCaptureProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const create = useMutation(api.opportunities.create)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  async function handleSubmit(values: OpportunityFormSubmit) {
    setPending(true)
    try {
      // Construction dynamique : aucun champ undefined transmis a Convex.
      const args: Record<string, unknown> = {
        title: values.title,
        type: values.type,
        stage: values.stage,
        tags: values.tags,
      }
      if (values.source) args.source = values.source
      if (values.url) args.url = values.url
      if (values.location) args.location = values.location
      if (values.compensation) args.compensation = values.compensation
      if (values.deadline) args.deadline = values.deadline
      if (values.nextActionAt) args.nextActionAt = values.nextActionAt
      if (values.description) args.description = values.description

      await create(args as Parameters<typeof create>[0])
      toast.success('Opportunite ajoutee.')
      setIsOpen(false)
    } catch {
      toast.error("Impossible d'ajouter l'opportunite.")
    } finally {
      setPending(false)
    }
  }

  return (
    <QuickCaptureContext.Provider value={{ open, close, isOpen }}>
      {children}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto p-6 sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-base">
              <span className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
                <Zap className="size-3.5" />
              </span>
              Capture rapide
            </SheetTitle>
            <SheetDescription>
              Ajoutez une opportunite a votre pipeline en quelques secondes.
            </SheetDescription>
          </SheetHeader>
          {/* Le formulaire n'est monte que lorsque le Sheet est ouvert, pour
              repartir d'un etat vierge a chaque ouverture. */}
          {isOpen && (
            <OpportunityForm
              submitLabel="Ajouter"
              onSubmit={handleSubmit}
              onCancel={close}
              pending={pending}
            />
          )}
        </SheetContent>
      </Sheet>
    </QuickCaptureContext.Provider>
  )
}

export function useQuickCapture(): QuickCaptureContextValue {
  const ctx = useContext(QuickCaptureContext)
  if (!ctx) {
    throw new Error(
      'useQuickCapture doit etre utilise dans un <QuickCaptureProvider>.',
    )
  }
  return ctx
}
