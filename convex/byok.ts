/**
 * BYOK — « apportez votre propre clé » (OpenRouter), perk des paliers Copilot.
 *
 * Un utilisateur Copilot / Copilot Max branche sa propre clé API OpenRouter :
 * ses appels au copilote passent alors par SON compte (il paie son fournisseur
 * directement) et NE consomment PAS nos crédits. Le serveur reste l'autorité :
 *  - l'éligibilité (`allowsByok`) est vérifiée côté serveur, jamais le client ;
 *  - la clé est validée auprès d'OpenRouter avant d'être acceptée ;
 *  - elle est chiffrée au repos (AES-256-GCM, `lib/crypto.ts`), jamais stockée
 *    ni journalisée en clair, et JAMAIS renvoyée au client (seul `last4`).
 */

import { v } from 'convex/values'
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import { internal } from './_generated/api'
import type { Doc } from './_generated/dataModel'
import type { QueryCtx, MutationCtx } from './lib/withUser'
import { requireUser, requireUserFromAction, currentPlan } from './lib/withUser'
import { allowsByok, planLimitError, validationError } from './lib/plan'
import { encryptSecret, last4 } from './lib/crypto'

const OPENROUTER_KEY_URL = 'https://openrouter.ai/api/v1/key'

/** Résout la ligne `users` du user courant via l'index `by_authId`. */
function userDoc(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<Doc<'users'> | null> {
  return ctx.db
    .query('users')
    .withIndex('by_authId', (q) => q.eq('authId', userId))
    .unique()
}

/**
 * `api.byok.status` : état BYOK du user courant pour l'UI (Réglages). Ne renvoie
 * JAMAIS la clé ni le chiffré — seulement la présence, le fournisseur, les 4
 * derniers caractères et la date d'ajout. Inclut l'éligibilité du palier pour
 * piloter l'affichage (carte active vs invitation à passer à Copilot).
 */
export const status = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx)
    const doc = await userDoc(ctx, userId)
    return {
      eligible: allowsByok(doc?.plan ?? null),
      hasKey: Boolean(doc?.byokKeyCiphertext),
      provider: doc?.byokProvider ?? null,
      last4: doc?.byokKeyLast4 ?? null,
      addedAt: doc?.byokKeyAddedAt ?? null,
    }
  },
})

/**
 * `internal.byok.resolve` : pour `aiChat.sendMessage`. Renvoie l'éligibilité du
 * palier et le chiffré de la clé (le déchiffrement se fait dans l'action). Le
 * chiffré ne sort jamais d'un contexte interne.
 */
export const resolve = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const plan = await currentPlan(ctx, userId)
    const doc = await userDoc(ctx, userId)
    return {
      eligible: allowsByok(plan),
      ciphertext: doc?.byokKeyCiphertext ?? null,
      provider: doc?.byokProvider ?? null,
    }
  },
})

/** `internal.byok.store` : persiste le chiffré + métadonnées non sensibles. */
export const store = internalMutation({
  args: {
    userId: v.string(),
    provider: v.literal('openrouter'),
    ciphertext: v.string(),
    last4: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    const doc = await userDoc(ctx, args.userId)
    if (!doc) throw validationError('Compte introuvable.')
    await ctx.db.patch(doc._id, {
      byokProvider: args.provider,
      byokKeyCiphertext: args.ciphertext,
      byokKeyLast4: args.last4,
      byokKeyAddedAt: Date.now(),
    })
    return null
  },
})

/**
 * `api.byok.setKey` : enregistre la clé OpenRouter de l'utilisateur. Gate palier
 * (Copilot+) côté serveur, valide la clé auprès d'OpenRouter (`GET /api/v1/key`),
 * puis chiffre et stocke. Renvoie `last4` + le solde restant du compte (info UI).
 * La clé en clair ne quitte jamais cette action (ni stockage, ni log).
 */
export const setKey = action({
  args: { key: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ last4: string; limitRemaining: number | null }> => {
    const { userId } = await requireUserFromAction(ctx)
    const { eligible } = await ctx.runQuery(internal.byok.resolve, { userId })
    if (!eligible) {
      throw planLimitError(
        'La clé personnelle (BYOK) est réservée aux paliers Copilot. Passez à Copilot pour brancher votre propre clé OpenRouter.',
      )
    }

    const key = args.key.trim()
    if (!key.startsWith('sk-or-')) {
      throw validationError(
        'Clé OpenRouter invalide : elle doit commencer par « sk-or- ».',
      )
    }

    // Validation auprès d'OpenRouter : la clé doit être active (200). On lit
    // aussi le solde restant pour le restituer à l'UI (info non bloquante).
    type KeyInfo = { data?: { limit_remaining?: number | null } }
    let info: KeyInfo | null = null
    try {
      const res = await fetch(OPENROUTER_KEY_URL, {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (!res.ok) {
        throw validationError(
          'Clé OpenRouter refusée (authentification échouée). Vérifiez la clé et réessayez.',
        )
      }
      info = (await res.json().catch(() => null)) as KeyInfo | null
    } catch (err) {
      // Re-throw nos ConvexError métier ; encapsuler les erreurs réseau brutes.
      if (err && typeof err === 'object' && 'data' in err) throw err
      throw validationError(
        'Impossible de joindre OpenRouter pour valider la clé. Réessayez dans un instant.',
      )
    }

    const ciphertext = await encryptSecret(key, userId, 'openrouter')
    await ctx.runMutation(internal.byok.store, {
      userId,
      provider: 'openrouter',
      ciphertext,
      last4: last4(key),
    })
    return {
      last4: last4(key),
      limitRemaining: info?.data?.limit_remaining ?? null,
    }
  },
})

/**
 * `api.byok.removeKey` : retire la clé personnelle. Les prochains appels au
 * copilote repassent par nos crédits (régime normal). Idempotent.
 */
export const removeKey = mutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    const { userId } = await requireUser(ctx)
    const doc = await userDoc(ctx, userId)
    if (!doc) return null
    await ctx.db.patch(doc._id, {
      byokProvider: undefined,
      byokKeyCiphertext: undefined,
      byokKeyLast4: undefined,
      byokKeyAddedAt: undefined,
    })
    return null
  },
})
