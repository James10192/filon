import { useState } from 'react'
import { useAction, useQuery } from 'convex/react'
import { Loader2, Radar } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Button } from '~/components/ui/button'
import { toast } from '~/components/ui/sonner'

/**
 * Veille manuelle, disponible sur TOUS les paliers (le cron auto, lui, est réservé
 * aux comptes payants). Un clic déclenche un passage immédiat sur les sources et
 * remonte le résultat via toast. Anti double-clic et limitation côté serveur gérée.
 */
export function RunNowButton() {
  const runNow = useAction(api.veille.actions.runNow)
  const searches = useQuery(api.savedSearches.list, {})
  const [running, setRunning] = useState(false)

  async function handleRun() {
    // Pas de veille : inutile de lancer, on invite à en créer une.
    if (searches !== undefined && searches.length === 0) {
      toast.info('Créez d’abord une veille pour lancer la recherche.')
      return
    }
    setRunning(true)
    try {
      const result = await runNow({})
      if (result.throttled) {
        const seconds = result.retryInSec ?? 60
        toast.info(`Veille déjà lancée, réessayez dans ${seconds}s.`)
      } else if (result.imported > 0) {
        const plural = result.imported > 1 ? 's' : ''
        toast.success(
          `${result.imported} nouvelle${plural} offre${plural} ajoutée${plural} à votre pipeline.`,
        )
      } else {
        toast.info('Aucune nouvelle offre pour le moment.')
      }
    } catch {
      toast.error('Le lancement de la veille a échoué. Réessayez.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleRun} disabled={running}>
      {running ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Radar className="size-4" />
      )}
      Lancer maintenant
    </Button>
  )
}
