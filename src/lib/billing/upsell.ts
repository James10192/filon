import { toast } from '~/components/ui/sonner'
import { planLimitMessage } from './plan'

/**
 * UI d'upsell partagée. Si `error` est une limite freemium, affiche un toast
 * dédié avec une action « Voir les tarifs » qui mène à /app/tarifs, et renvoie
 * `true` (l'appelant n'affiche alors PAS son toast d'erreur générique). Sinon
 * renvoie `false` : l'appelant gère l'erreur normalement.
 */
export function handlePlanLimit(error: unknown): boolean {
  const message = planLimitMessage(error)
  if (!message) return false
  toast.error(message, {
    duration: 8000,
    action: {
      label: 'Voir les tarifs',
      onClick: () => {
        window.location.href = '/app/tarifs'
      },
    },
  })
  return true
}
