import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModelV3 } from '@openrouter/ai-sdk-provider'

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
export type AiMode = 'fast' | 'quality'

export const MODELS: Record<AiMode, string> = {
  fast: 'openai/gpt-5.4-mini',
  quality: 'anthropic/claude-sonnet-4.6',
}

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  extraBody: { usage: { include: true } },
})

/** Modèle de langage AI SDK (LanguageModelV3) pour un mode donné. */
export function modelFor(mode: AiMode): LanguageModelV3 {
  return openrouter.chat(MODELS[mode])
}
