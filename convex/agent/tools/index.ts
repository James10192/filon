import { pipelineTools } from './pipeline'
import { followupTools } from './followups'
import { proposalTools } from './proposals'
import { carnetTools } from './carnet'

/**
 * Boîte à outils complète du copilote, agrégée par domaine : pipeline
 * (opportunités, lecture + écriture), relances, propositions, carnet. Les
 * écritures restent soumises à approbation selon les préférences du user. Passée
 * au constructeur de l'Agent (et filtrable par le gating dans `aiChat`).
 */
export const tools = {
  ...pipelineTools,
  ...followupTools,
  ...proposalTools,
  ...carnetTools,
}
