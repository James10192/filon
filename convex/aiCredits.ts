import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { requireUser } from './lib/withUser'
import {
  AI_MONTHLY_CREDITS,
  aiAccess,
  FAIR_USE_CEILING,
  FAIR_USE_PLANS,
  planOf,
  type Plan,
} from './lib/plan'
import { aiBudgetStatus, type AiBudgetStatus } from './lib/aiGate'

/**
 * Domaine aiCredits · solde et consommation des crédits IA du copilote.
 *
 * Modèle : `balance` (allocation mensuelle restante, remise par le cron) +
 * `packBalance` (crédits achetés à la carte, persistants). La consommation
 * pioche d'abord dans `balance`, puis dans `packBalance`. Les écritures de solde
 * passent par des `internalMutation` (cron mensuel, webhook Paystack, débit post
 * échange) : le client ne peut PAS s'auto-créditer.
 */

const modeValidator = v.union(v.literal('fast'), v.literal('quality'))

/** Résout la ligne `users` par identifiant Better Auth. */
async function userByAuthId(
  ctx: { db: any },
  authId: string,
): Promise<Doc<'users'> | null> {
  return ctx.db
    .query('users')
    .withIndex('by_authId', (q: any) => q.eq('authId', authId))
    .unique()
}

/** Ligne de crédits d'un user (ou null). */
async function creditsOf(
  ctx: { db: any },
  userId: string,
): Promise<Doc<'aiCredits'> | null> {
  return ctx.db
    .query('aiCredits')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .unique()
}

/**
 * S'assure qu'une ligne de crédits existe pour un user IA, en l'initialisant à
 * l'allocation mensuelle de son palier. Idempotent.
 */
export const ensureCredits = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<null> => {
    const existing = await creditsOf(ctx, userId)
    if (existing) return null
    const userDoc = await userByAuthId(ctx, userId)
    const plan: Plan = planOf(userDoc?.plan ?? null)
    const allowance = AI_MONTHLY_CREDITS[plan]
    await ctx.db.insert('aiCredits', {
      userId,
      balance: allowance,
      monthlyAllowance: allowance,
      periodStart: Date.now(),
      packBalance: 0,
      updatedAt: Date.now(),
    })
    return null
  },
})

/**
 * `internal.aiCredits.debit` : débite `credits` du solde après un échange IA,
 * et journalise l'usage. Débite d'abord `balance`, puis `packBalance`. Le solde
 * ne descend jamais sous zéro (le solde est vérifié AVANT l'appel LLM dans
 * `aiChat.sendMessage`). Écrit la ligne `aiUsage`.
 */
export const debit = internalMutation({
  args: {
    userId: v.string(),
    threadId: v.string(),
    model: v.string(),
    mode: modeValidator,
    inputTokens: v.number(),
    outputTokens: v.number(),
    credits: v.number(),
    costUsd: v.optional(v.number()),
    toolsUsed: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const row = await creditsOf(ctx, args.userId)
    if (row) {
      const fromBalance = Math.min(row.balance, args.credits)
      const remainder = args.credits - fromBalance
      const fromPack = Math.min(row.packBalance, remainder)
      await ctx.db.patch(row._id, {
        balance: row.balance - fromBalance,
        packBalance: row.packBalance - fromPack,
        updatedAt: Date.now(),
      })
    }

    const usage: Record<string, unknown> = {
      userId: args.userId,
      threadId: args.threadId,
      model: args.model,
      mode: args.mode,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      creditsDebited: args.credits,
      toolsUsed: args.toolsUsed,
      createdAt: Date.now(),
    }
    if (args.costUsd !== undefined) usage.costUsd = args.costUsd
    await ctx.db.insert(
      'aiUsage',
      usage as Omit<Doc<'aiUsage'>, '_id' | '_creationTime'>,
    )
    return null
  },
})

/**
 * `internal.aiCredits.resetMonthlyAllowances` : cron mensuel. Réinitialise le
 * `balance` de chaque ligne IA à l'allocation mensuelle du palier courant du
 * user (le `packBalance` n'est jamais touché). Les paliers non-IA retombent à 0.
 */
export const resetMonthlyAllowances = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ updated: number }> => {
    const rows = await ctx.db.query('aiCredits').collect()
    const now = Date.now()
    let updated = 0
    for (const row of rows) {
      const userDoc = await userByAuthId(ctx, row.userId)
      const plan: Plan = planOf(userDoc?.plan ?? null)
      const allowance = AI_MONTHLY_CREDITS[plan]
      await ctx.db.patch(row._id, {
        balance: allowance,
        monthlyAllowance: allowance,
        periodStart: now,
        updatedAt: now,
      })
      updated += 1
    }
    return { updated }
  },
})

/**
 * `internal.aiCredits.creditPack` : ajoute des crédits achetés (pack Paystack)
 * au `packBalance`. Appelé par le webhook signé après `charge.success` d'un
 * achat de pack. Crée la ligne de crédits si elle n'existe pas encore.
 */
export const creditPack = internalMutation({
  args: {
    userId: v.optional(v.string()),
    email: v.optional(v.string()),
    credits: v.number(),
  },
  handler: async (ctx, args): Promise<boolean> => {
    let userDoc: Doc<'users'> | null = null
    if (args.userId) userDoc = await userByAuthId(ctx, args.userId)
    if (!userDoc && args.email) {
      userDoc = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', args.email!))
        .unique()
    }
    if (!userDoc) return false
    const userId = userDoc.authId

    const row = await creditsOf(ctx, userId)
    const now = Date.now()
    if (row) {
      await ctx.db.patch(row._id, {
        packBalance: row.packBalance + args.credits,
        updatedAt: now,
      })
    } else {
      const allowance = AI_MONTHLY_CREDITS[planOf(userDoc.plan ?? null)]
      await ctx.db.insert('aiCredits', {
        userId,
        balance: allowance,
        monthlyAllowance: allowance,
        periodStart: now,
        packBalance: args.credits,
        updatedAt: now,
      })
    }
    return true
  },
})

/**
 * `api.aiCredits.myCredits` : solde + allocation + consommation du mois pour le
 * user courant. Ne throw pas hors session (retourne null). Sert au badge de
 * crédits du copilote et à l'UI de recharge.
 */
export const myCredits = query({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    plan: Plan
    aiAccess: boolean
    balance: number
    packBalance: number
    monthlyAllowance: number
    monthCreditsUsed: number
    fairUse: boolean
    ceiling: number
    status: AiBudgetStatus
  } | null> => {
    const authUser = await (async () => {
      try {
        return await requireUser(ctx)
      } catch {
        return null
      }
    })()
    if (!authUser) return null

    const userDoc = await userByAuthId(ctx, authUser.userId)
    const plan = planOf(userDoc?.plan ?? null)
    const row = await creditsOf(ctx, authUser.userId)

    // Consommation depuis le début de la période courante.
    const periodStart = row?.periodStart ?? 0
    const usageRows = await ctx.db
      .query('aiUsage')
      .withIndex('by_user_created', (q) =>
        q.eq('userId', authUser.userId).gte('createdAt', periodStart),
      )
      .collect()
    const monthCreditsUsed = usageRows.reduce(
      (sum, u) => sum + u.creditsDebited,
      0,
    )

    const balance = (row?.balance ?? 0) + (row?.packBalance ?? 0)
    const allowance = row?.monthlyAllowance ?? AI_MONTHLY_CREDITS[plan]
    // État de service dérivé (même décision que le gate serveur, sans throw) :
    // pilote le nudge « usage loyal » et la jauge en dépassement côté UI.
    const status = aiBudgetStatus({
      plan,
      balance,
      monthUsed: monthCreditsUsed,
      allowance,
    })

    return {
      plan,
      aiAccess: aiAccess(plan),
      balance: row?.balance ?? 0,
      packBalance: row?.packBalance ?? 0,
      monthlyAllowance: allowance,
      monthCreditsUsed,
      fairUse: FAIR_USE_PLANS.has(plan),
      ceiling: allowance * FAIR_USE_CEILING,
      status,
    }
  },
})

/**
 * `internal.aiCredits.balanceFor` : solde combiné (balance + packBalance) d'un
 * user. Utilisé par `aiChat.sendMessage` pour le pré-contrôle de crédits avant
 * l'appel LLM (depuis une action, via `runQuery`).
 */
export const balanceFor = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<number> => {
    const row = await creditsOf(ctx, userId)
    return (row?.balance ?? 0) + (row?.packBalance ?? 0)
  },
})
