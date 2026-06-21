import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModelV3 } from '@openrouter/ai-sdk-provider'
import { allowsPriorityRouting, type Plan } from '../lib/plan'

/**
 * Modèles LLM du copilote, via OpenRouter.
 *
 * La clé vit UNIQUEMENT côté serveur (`OPENROUTER_API_KEY`, jamais committée).
 * `extraBody.usage.include` demande à OpenRouter de renvoyer la comptabilité de
 * tokens/coût dans la réponse, ce qui alimente le débit de crédits (onFinish).
 *
 * Deux modes exposés à l'utilisateur :
 *  - `fast`   (« Rapide »)  : modèle économique et véloce, défaut du copilote.
 *  - `quality`(« Qualité ») : modèle premium pour les raisonnements exigeants.
 */
import type { AiMode } from '../lib/pricing'
export type { AiMode }

export const MODELS: Record<AiMode, string> = {
  fast: 'openai/gpt-5.4-mini',
  quality: 'anthropic/claude-sonnet-4.6',
}

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  extraBody: { usage: { include: true } },
})

/**
 * Instance prioritaire : routage OpenRouter optimisé débit, réservé au palier
 * Copilot Max (perk vitesse). `provider.sort: 'throughput'` privilégie les
 * fournisseurs les plus rapides ; `usage.include` reste actif pour la
 * comptabilité de tokens.
 */
const openrouterPriority = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  extraBody: {
    usage: { include: true },
    provider: { sort: 'throughput' },
  },
})

/**
 * Modèle de langage AI SDK (LanguageModelV3) pour un mode donné. Le `plan`
 * pilote le routage prioritaire (perk Copilot Max) sans changer le modèle
 * exposé à l'utilisateur via le toggle Rapide / Qualité.
 *
 * BYOK : si `byokKey` est fourni (clé OpenRouter de l'utilisateur, déjà validée
 * et déchiffrée côté serveur), on construit un provider éphémère sur SA clé.
 * L'appel est alors débité sur SON compte OpenRouter (pas le nôtre) ; le routage
 * prioritaire ne s'applique pas (routage par défaut sur sa propre clé). La clé
 * n'est jamais persistée ni journalisée — elle ne vit que le temps de l'appel.
 */
export function modelFor(
  mode: AiMode,
  plan?: Plan | null,
  byokKey?: string,
): LanguageModelV3 {
  if (byokKey) {
    const userProvider = createOpenRouter({
      apiKey: byokKey,
      extraBody: { usage: { include: true } },
    })
    return userProvider.chat(MODELS[mode])
  }
  const provider = allowsPriorityRouting(plan) ? openrouterPriority : openrouter
  return provider.chat(MODELS[mode])
}
