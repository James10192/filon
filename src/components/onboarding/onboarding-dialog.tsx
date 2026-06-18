import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { toast } from '~/components/ui/sonner'
import { cn } from '~/lib/utils'
import { ACTIVITY_PROFILES } from './activity-meta'

/**
 * Dialog d'onboarding adaptatif, affiche a la 1re connexion (quand
 * `users.onboardedAt` est absent). Demande le profil d'activite, puis pose
 * `activityType` + `onboardedAt` et pre-cree les etiquettes par defaut adaptees.
 *
 * Non bloquant : l'utilisateur peut passer cette etape. On marque malgre tout
 * l'onboarding comme termine (sans `activityType`) pour ne pas re-afficher le
 * dialog a chaque navigation.
 */
export function OnboardingDialog() {
  const me = useQuery(api.users.me, {})
  const setActivity = useMutation(api.users.setActivity)
  const completeOnboarding = useMutation(api.users.completeOnboarding)
  const ensureTags = useMutation(api.tags.ensureTags)

  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Ferme localement des qu'une action aboutit (la query met du temps a refleter
  // `onboardedAt` ; on ne veut pas laisser le dialog visible entre-temps).
  const [dismissed, setDismissed] = useState(false)

  // Tant que le profil n'est pas charge, on n'affiche rien (evite un flash).
  if (me === undefined || me === null) return null
  // Onboarding deja fait, ou ferme dans cette session.
  if (me.onboardedAt || dismissed) return null

  async function handleConfirm() {
    if (!selected || submitting) return
    const profile = ACTIVITY_PROFILES.find((p) => p.value === selected)
    setSubmitting(true)
    try {
      await setActivity({ activityType: selected })
      if (profile && profile.defaultTags.length > 0) {
        await ensureTags({ names: profile.defaultTags })
      }
      await completeOnboarding({ activityType: selected })
      toast.success('Bienvenue sur Filon, votre espace est prêt.')
      setDismissed(true)
    } catch {
      toast.error("La configuration n'a pas pu être enregistrée.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSkip() {
    if (submitting) return
    setSubmitting(true)
    try {
      await completeOnboarding({})
      setDismissed(true)
    } catch {
      toast.error("L'étape n'a pas pu être passée.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && handleSkip()}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Quelle est votre activité&nbsp;?</DialogTitle>
          <DialogDescription>
            On adapte vos étiquettes et vos libellés à votre métier. Vous pourrez
            tout modifier ensuite.
          </DialogDescription>
        </DialogHeader>

        <div
          role="radiogroup"
          aria-label="Profil d'activité"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {ACTIVITY_PROFILES.map((profile) => {
            const Icon = profile.icon
            const active = selected === profile.value
            return (
              <button
                key={profile.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(profile.value)}
                className={cn(
                  'flex items-start gap-3 rounded-[var(--radius)] border p-3 text-left transition-colors',
                  active
                    ? 'border-accent bg-accent-soft'
                    : 'border-border bg-surface hover:bg-surface-2',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)]',
                    active
                      ? 'bg-accent text-accent-fg'
                      : 'bg-surface-2 text-fg-muted',
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      'block text-sm font-medium',
                      active ? 'text-accent' : 'text-fg',
                    )}
                  >
                    {profile.label}
                  </span>
                  <span className="block text-xs text-fg-muted">
                    {profile.hint}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            disabled={submitting}
          >
            Passer
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !selected}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Continuer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
