import { Agent, stepCountIs } from '@convex-dev/agent'
import { components } from '../_generated/api'
import { modelFor } from './models'
import { INSTRUCTIONS } from './instructions'
import { tools } from './tools'

/**
 * Le copilote Filon : agent unique, outils de lecture (auto) + écriture
 * (approbation). Modèle par défaut = `fast` (le mode `quality` est passé
 * ponctuellement à `streamText` via `model`). `stopWhen: stepCountIs(5)` borne
 * le nombre d'étapes (appels d'outils chaînés) par échange.
 */
export const copilot = new Agent(components.agent, {
  name: 'Copilote Filon',
  languageModel: modelFor('fast'),
  instructions: INSTRUCTIONS,
  tools,
  stopWhen: stepCountIs(5),
})
