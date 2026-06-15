import { useState } from 'react'
import { useAction, useQuery } from 'convex/react'
import { Loader2, Radar } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Button } from '~/components/ui/button'
import { toast } from '~/components/ui/sonner'
import { RunPanel, type RunPanelState, type RunResult } from './run-panel'

/**
 * Veille manuelle, disponible sur TOUS les paliers (le cron auto, lui, est réservé
 * aux comptes payants). Un clic ouvre un panneau de run qui montre l'analyse en
 * direct puis le résultat riche (sources analysées, offres captées). Un toast court
 * sert de fallback. Anti double-clic et cooldown serveur gérés.
 */
export function RunNowButton() {
  const runNow = useAction(api.veille.actions.runNow)
  const searches = useQuery(api.savedSearches.list, {})
  const [running, setRunning] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [state, setState] = useState<RunPanelState>({ phase: 'analyzing' })

  async function handleRun() {
    if (running) return
    // Pas de veille : on ouvre le panneau sur l'invite à en créer une.
    if (searches !== undefined && searches.length === 0) {
      setState({ phase: 'no-search' })
      setPanelOpen(true)
      return
    }

    setRunning(true)
    setState({ phase: 'analyzing' })
    setPanelOpen(true)
    try {
      const result = (await runNow({})) as RunResult
      setState({ phase: 'result', result })

      if (result.throttled) {
        toast.info(
          `Veille déjà lancée, réessayez dans ${result.retryInSec ?? 60}s.`,
        )
      } else if (result.imported > 0) {
        const plural = result.imported > 1 ? 's' : ''
        toast.success(
          `${result.imported} nouvelle${plural} offre${plural} captée${plural}.`,
        )
      } else {
        toast.info('Aucune nouvelle offre pour le moment.')
      }
    } catch {
      setState({ phase: 'error' })
      toast.error('Le lancement de la veille a échoué. Réessayez.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={handleRun} disabled={running}>
        {running ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Radar className="size-4" />
        )}
        Lancer maintenant
      </Button>
      <RunPanel open={panelOpen} onOpenChange={setPanelOpen} state={state} />
    </>
  )
}
