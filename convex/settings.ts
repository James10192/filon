import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './lib/withUser'

/**
 * Domaine : preferences utilisateur (`api.settings.*`).
 *
 * Une seule ligne `settings` par user. Multi-tenant strict : chaque fonction
 * commence par `requireUser(ctx)` et scope via l'index `by_user`. Toute ecriture
 * force `userId` a la valeur du user courant (jamais depuis les args du client).
 *
 * Champs metier :
 * - `currency` : devise par defaut d'affichage du CA (defaut `XOF`).
 * - `pipelineStages` : libelles personnalises des etapes du pipeline (optionnel,
 *   sinon les defauts du produit s'appliquent cote front).
 */

/** Forme retournee quand aucune ligne n'existe encore (ne throw pas). */
const DEFAULT_SETTINGS = {
  pipelineStages: undefined as string[] | undefined,
  currency: 'XOF',
  mailpulsePromptOnWon: true,
  mailpulseConnectionStatus: 'not_linked' as const,
  mailpulseAccountId: undefined as string | undefined,
  mailpulseWorkspaceId: undefined as string | undefined,
  mailpulseBaseUrl: undefined as string | undefined,
  mailpulseApiKeyPreview: undefined as string | undefined,
  mailpulseApiKeySet: false,
  recoveryReminderDelayDays: 3,
  recoveryFallbackFollowupEnabled: true,
  recoveryPreferredChannels: ['email', 'whatsapp'] as Array<
    'email' | 'whatsapp'
  >,
  recoveryMode: 'semi_auto' as const,
}

const connectionStatusValidator = v.union(
  v.literal('not_linked'),
  v.literal('pending'),
  v.literal('linked'),
)

const recoveryChannelValidator = v.union(
  v.literal('email'),
  v.literal('whatsapp'),
)

const recoveryModeValidator = v.union(
  v.literal('manual'),
  v.literal('semi_auto'),
  v.literal('automatic'),
)

/**
 * Preferences du user courant. Retourne un objet par defaut si la ligne n'a
 * pas encore ete creee (ne throw pas), pour que la page Parametres puisse
 * toujours afficher des valeurs.
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx)

    const settings = await ctx.db
      .query('settings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    if (!settings) {
      return DEFAULT_SETTINGS
    }
    const { mailpulseApiKey, ...safeSettings } = settings
    return {
      ...DEFAULT_SETTINGS,
      ...safeSettings,
      mailpulseApiKeySet: Boolean(mailpulseApiKey),
    }
  },
})

/**
 * Cree la ligne de preferences si elle est absente, sinon la met a jour.
 * Patch + `updatedAt`. Jamais `undefined` dans l'insert/patch : on ne pose que
 * les champs reellement fournis.
 */
export const upsert = mutation({
  args: {
    pipelineStages: v.optional(v.array(v.string())),
    currency: v.optional(v.string()),
    mailpulsePromptOnWon: v.optional(v.boolean()),
    mailpulseConnectionStatus: v.optional(connectionStatusValidator),
    mailpulseAccountId: v.optional(v.string()),
    mailpulseWorkspaceId: v.optional(v.string()),
    mailpulseBaseUrl: v.optional(v.string()),
    mailpulseApiKey: v.optional(v.string()),
    recoveryReminderDelayDays: v.optional(v.number()),
    recoveryFallbackFollowupEnabled: v.optional(v.boolean()),
    recoveryPreferredChannels: v.optional(v.array(recoveryChannelValidator)),
    recoveryMode: v.optional(recoveryModeValidator),
  },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    const now = Date.now()

    const existing = await ctx.db
      .query('settings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    if (existing) {
      const patch: {
        updatedAt: number
        pipelineStages?: string[]
        currency?: string
        mailpulsePromptOnWon?: boolean
        mailpulseConnectionStatus?: 'not_linked' | 'pending' | 'linked'
        mailpulseAccountId?: string
        mailpulseWorkspaceId?: string
        mailpulseBaseUrl?: string
        mailpulseApiKey?: string
        mailpulseApiKeyPreview?: string
        recoveryReminderDelayDays?: number
        recoveryFallbackFollowupEnabled?: boolean
        recoveryPreferredChannels?: Array<'email' | 'whatsapp'>
        recoveryMode?: 'manual' | 'semi_auto' | 'automatic'
      } = { updatedAt: now }
      if (args.pipelineStages !== undefined) {
        patch.pipelineStages = args.pipelineStages
      }
      if (args.currency !== undefined) patch.currency = args.currency
      if (args.mailpulsePromptOnWon !== undefined) {
        patch.mailpulsePromptOnWon = args.mailpulsePromptOnWon
      }
      if (args.mailpulseConnectionStatus !== undefined) {
        patch.mailpulseConnectionStatus = args.mailpulseConnectionStatus
      }
      if (args.mailpulseAccountId !== undefined) {
        patch.mailpulseAccountId = args.mailpulseAccountId
      }
      if (args.mailpulseWorkspaceId !== undefined) {
        patch.mailpulseWorkspaceId = args.mailpulseWorkspaceId
      }
      if (args.mailpulseBaseUrl !== undefined) {
        patch.mailpulseBaseUrl = normalizeMailpulseBaseUrl(
          args.mailpulseBaseUrl,
        )
      }
      if (args.mailpulseApiKey !== undefined) {
        const apiKey = args.mailpulseApiKey.trim()
        if (apiKey) {
          patch.mailpulseApiKey = apiKey
          patch.mailpulseApiKeyPreview = previewApiKey(apiKey)
          patch.mailpulseConnectionStatus = 'linked'
        }
      }
      if (args.recoveryReminderDelayDays !== undefined) {
        patch.recoveryReminderDelayDays = args.recoveryReminderDelayDays
      }
      if (args.recoveryFallbackFollowupEnabled !== undefined) {
        patch.recoveryFallbackFollowupEnabled =
          args.recoveryFallbackFollowupEnabled
      }
      if (args.recoveryPreferredChannels !== undefined) {
        patch.recoveryPreferredChannels = args.recoveryPreferredChannels
      }
      if (args.recoveryMode !== undefined) {
        patch.recoveryMode = args.recoveryMode
      }
      await ctx.db.patch(existing._id, patch)
      return null
    }

    const doc: {
      userId: string
      createdAt: number
      updatedAt: number
      pipelineStages?: string[]
      currency?: string
      mailpulsePromptOnWon?: boolean
      mailpulseConnectionStatus?: 'not_linked' | 'pending' | 'linked'
      mailpulseAccountId?: string
      mailpulseWorkspaceId?: string
      mailpulseBaseUrl?: string
      mailpulseApiKey?: string
      mailpulseApiKeyPreview?: string
      recoveryReminderDelayDays?: number
      recoveryFallbackFollowupEnabled?: boolean
      recoveryPreferredChannels?: Array<'email' | 'whatsapp'>
      recoveryMode?: 'manual' | 'semi_auto' | 'automatic'
    } = { userId, createdAt: now, updatedAt: now }
    if (args.pipelineStages !== undefined) doc.pipelineStages = args.pipelineStages
    if (args.currency !== undefined) doc.currency = args.currency
    if (args.mailpulsePromptOnWon !== undefined) {
      doc.mailpulsePromptOnWon = args.mailpulsePromptOnWon
    }
    if (args.mailpulseConnectionStatus !== undefined) {
      doc.mailpulseConnectionStatus = args.mailpulseConnectionStatus
    }
    if (args.mailpulseAccountId !== undefined) {
      doc.mailpulseAccountId = args.mailpulseAccountId
    }
    if (args.mailpulseWorkspaceId !== undefined) {
      doc.mailpulseWorkspaceId = args.mailpulseWorkspaceId
    }
    if (args.mailpulseBaseUrl !== undefined) {
      doc.mailpulseBaseUrl = normalizeMailpulseBaseUrl(args.mailpulseBaseUrl)
    }
    if (args.mailpulseApiKey !== undefined) {
      const apiKey = args.mailpulseApiKey.trim()
      if (apiKey) {
        doc.mailpulseApiKey = apiKey
        doc.mailpulseApiKeyPreview = previewApiKey(apiKey)
        doc.mailpulseConnectionStatus = 'linked'
      }
    }
    if (args.recoveryReminderDelayDays !== undefined) {
      doc.recoveryReminderDelayDays = args.recoveryReminderDelayDays
    }
    if (args.recoveryFallbackFollowupEnabled !== undefined) {
      doc.recoveryFallbackFollowupEnabled =
        args.recoveryFallbackFollowupEnabled
    }
    if (args.recoveryPreferredChannels !== undefined) {
      doc.recoveryPreferredChannels = args.recoveryPreferredChannels
    }
    if (args.recoveryMode !== undefined) doc.recoveryMode = args.recoveryMode

    await ctx.db.insert('settings', doc)
    return null
  },
})

function normalizeMailpulseBaseUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed.includes('@')) return ''

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
  try {
    const url = new URL(withProtocol)
    if (!url.hostname.includes('.')) return ''
    return url.origin.replace(/\/+$/, '')
  } catch {
    return ''
  }
}

function previewApiKey(value: string): string {
  if (value.length <= 14) return `${value.slice(0, 4)}...`
  return `${value.slice(0, 10)}...${value.slice(-4)}`
}
