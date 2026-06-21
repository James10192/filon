import { pipelineTools } from './pipeline'
import { followupTools } from './followups'
import { proposalTools } from './proposals'
import { carnetTools } from './carnet'
import { teamTools } from './team'
import { networkTools } from './network'
import { referralTools } from './referral'
import { veilleTools } from './veille'

/**
 * Boîte à outils complète du copilote, agrégée par domaine : pipeline, relances,
 * propositions, carnet (couche solo), puis équipe, réseau, affiliation et veille
 * (couche premium). Les écritures restent soumises à approbation ; les outils
 * équipe revalident le rôle manager côté serveur. Passée au constructeur de
 * l'Agent — mais l'exposition réelle par échange est FILTRÉE par le gating
 * (`gating.toolsFor` + `tools/manifest`) selon le palier et le rôle d'org.
 */
export const tools = {
  ...pipelineTools,
  ...followupTools,
  ...proposalTools,
  ...carnetTools,
  ...teamTools,
  ...networkTools,
  ...referralTools,
  ...veilleTools,
}
