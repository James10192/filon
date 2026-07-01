import { useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { ExternalLink, Loader2, Mail, MessageCircle, PlugZap } from 'lucide-react'
import type { Id } from '../../../convex/_generated/dataModel'
import { api } from '../../../convex/_generated/api'
import { mailpulseConnectUrl, mailpulseSignupUrl } from '~/lib/mailpulse'
import { toast } from '~/components/ui/sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { MailPulseWordmark } from './mailpulse-brand'
import { RecoveryFallbackFollowupNotice } from './recovery-fallback-followup-notice'
import type { MailPulseSettings } from './types'

type Me = { email?: string; name?: string } | null | undefined

export function MailPulseRecoveryDialog({
  open,
  onOpenChange,
  opportunityId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunityId: Id<'opportunities'>
}) {
  const me = useQuery(api.users.me, {}) as Me
  const settings = useQuery(api.settings.get, {}) as
    | MailPulseSettings
    | undefined
  const startMailpulseRecovery = useAction(api.recovery.startMailpulseRecovery)
  const createFollowup = useMutation(api.recovery.createManualFollowup)
  const markPending = useMutation(api.recovery.markMailpulsePending)
  const [pending, setPending] = useState<
    'start' | 'signup' | 'connect' | 'manual' | null
  >(null)
  const [manualCreated, setManualCreated] = useState(false)

  const configured =
    Boolean(settings?.mailpulseApiKeySet) && Boolean(settings?.mailpulseBaseUrl)

  async function launchMailPulseRecovery() {
    setPending('start')
    try {
      if (!configured) {
        await markPending({ opportunityId })
        window.open(mailpulseConnectUrl(), '_blank', 'noopener,noreferrer')
        toast.info('Configurez MailPulse pour lancer la séquence')
        onOpenChange(false)
        return
      }
      await startMailpulseRecovery({ opportunityId })
      toast.success('Séquence MailPulse préparée')
      onOpenChange(false)
    } catch {
      toast.error("Impossible de lancer le recouvrement MailPulse")
    } finally {
      setPending(null)
    }
  }

  async function openMailPulse(kind: 'signup' | 'connect') {
    setPending(kind)
    try {
      await markPending({ opportunityId })
      const url =
        kind === 'signup'
          ? mailpulseSignupUrl({ email: me?.email, name: me?.name })
          : mailpulseConnectUrl()
      window.open(url, '_blank', 'noopener,noreferrer')
      onOpenChange(false)
    } catch {
      toast.error("Impossible de préparer la liaison MailPulse")
    } finally {
      setPending(null)
    }
  }

  async function createLocalReminder() {
    setPending('manual')
    try {
      await createFollowup({ opportunityId })
      setManualCreated(true)
      toast.success('Relance de recouvrement planifiée')
    } catch {
      toast.error('Impossible de créer la relance')
    } finally {
      setPending(null)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mb-1 flex flex-wrap gap-2">
            <Badge variant="accent">
              <Mail className="size-3" />
              Email
            </Badge>
            <Badge variant="success">
              <MessageCircle className="size-3" />
              WhatsApp
            </Badge>
          </div>
          <AlertDialogTitle>
            <span className="flex items-center gap-2">
              <MailPulseWordmark className="text-lg" />
            </span>
            <span className="mt-2 block">Sécuriser ce paiement</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            Cette opportunité est gagnée. MailPulse peut prendre le relais pour
            les relances client par email et WhatsApp, pendant que Filon garde
            le suivi du recouvrement.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {manualCreated && <RecoveryFallbackFollowupNotice />}

        <div className="grid gap-2">
          <Button
            type="button"
            onClick={launchMailPulseRecovery}
            disabled={pending !== null || settings === undefined}
          >
            {pending === 'start' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <PlugZap className="size-4" />
            )}
            {configured
              ? 'Lancer la séquence MailPulse'
              : 'Configurer MailPulse'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => openMailPulse('signup')}
            disabled={pending !== null}
          >
            {pending === 'signup' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ExternalLink className="size-4" />
            )}
            Créer un compte MailPulse
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => openMailPulse('connect')}
            disabled={pending !== null}
          >
            {pending === 'connect' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <PlugZap className="size-4" />
            )}
            Lier mon compte MailPulse
          </Button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending !== null}>
            Fermer
          </AlertDialogCancel>
          <Button
            type="button"
            variant="outline"
            onClick={createLocalReminder}
            disabled={pending !== null || manualCreated}
          >
            {pending === 'manual' && <Loader2 className="size-4 animate-spin" />}
            Pas maintenant
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

