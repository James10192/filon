import { readTools } from './read'
import { writeTools } from './write'

/**
 * Boîte à outils complète du copilote : lectures (auto) + écritures (soumises à
 * approbation selon les préférences du user). Passée au constructeur de l'Agent.
 */
export const tools = {
  ...readTools,
  ...writeTools,
}
