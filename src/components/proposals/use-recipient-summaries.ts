import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { summarizeRecipients, type RecipientSummary } from './recipient-status'

/**
 * Charge tous les destinataires du user (une seule requete partagee) et les
 * agrege par `proposalId`. Sert aux vues liste/tableau/cartes pour refleter le
 * multi-cible (« 3 destinataires · 1 accepté ») sans une requete par carte.
 *
 * Renvoie `undefined` tant que la requete n'a pas resolu, puis une Map
 * `proposalId -> RecipientSummary` (les propositions sans destinataire ne
 * figurent pas dans la Map).
 */
export function useRecipientSummaries():
  | Map<string, RecipientSummary>
  | undefined {
  const recipients = useQuery(api.proposalRecipients.listByStatus, {})

  return useMemo(() => {
    if (recipients === undefined) return undefined
    const byProposal = new Map<string, { status: string }[]>()
    for (const r of recipients) {
      const list = byProposal.get(r.proposalId)
      if (list) list.push(r)
      else byProposal.set(r.proposalId, [r])
    }
    const summaries = new Map<string, RecipientSummary>()
    for (const [proposalId, list] of byProposal) {
      summaries.set(proposalId, summarizeRecipients(list))
    }
    return summaries
  }, [recipients])
}
