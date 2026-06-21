import { internalAction, internalMutation, internalQuery } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { priceXof, toPaystackSubunit, type Interval, type PaidPlan } from './lib/pricing'
import {
  PLAN_COMBOS,
  planKeyOf,
  paystackInterval,
  paystackPlanName,
  type PlanCodeMap,
} from './lib/paystackPlans'

/**
 * Souscriptions Paystack natives · provisionnement des Plans (catalogue PSP).
 *
 * `ensurePlans` (internalAction) crée/récupère les 8 Plans Paystack (4 paliers ×
 * 2 intervalles) de façon IDEMPOTENTE et cache leur `plan_code` dans la table
 * `billingPlans`. À lancer une fois après avoir posé la clé :
 *   npx convex run paystackPlans:ensurePlans
 * (une fois en test, une fois en live : les plan_code diffèrent entre modes).
 *
 * Tant que cette table est vide, `planCodeFor` renvoie null et le checkout
 * retombe sur le paiement ponctuel actuel → aucune régression en test-mode.
 *
 * La clé secrète vit uniquement dans `PAYSTACK_SECRET_KEY` (jamais committée).
 */

const PAYSTACK_BASE = 'https://api.paystack.co'

function secretKey(): string | null {
  return process.env.PAYSTACK_SECRET_KEY ?? null
}

type PaystackPlanRow = { name?: string; plan_code?: string }
type ListPlansResponse = { status?: boolean; data?: PaystackPlanRow[] }
type CreatePlanResponse = {
  status?: boolean
  message?: string
  data?: { plan_code?: string }
}

/**
 * `internal.paystackPlans.upsertPlanCode` : mémorise (ou met à jour) le
 * `plan_code` d'un couple dans `billingPlans`. Idempotent par `planKey`.
 */
export const upsertPlanCode = internalMutation({
  args: {
    planKey: v.string(),
    plan: v.union(
      v.literal('pro'),
      v.literal('pro_ai'),
      v.literal('copilot'),
      v.literal('copilot_max'),
    ),
    interval: v.union(v.literal('monthly'), v.literal('annual')),
    planCode: v.string(),
    amountXof: v.number(),
  },
  handler: async (ctx, args): Promise<null> => {
    const existing = await ctx.db
      .query('billingPlans')
      .withIndex('by_planKey', (q) => q.eq('planKey', args.planKey))
      .unique()
    const now = Date.now()
    if (existing) {
      await ctx.db.patch(existing._id, {
        planCode: args.planCode,
        amountXof: args.amountXof,
        updatedAt: now,
      })
    } else {
      await ctx.db.insert('billingPlans', {
        planKey: args.planKey,
        plan: args.plan,
        interval: args.interval,
        planCode: args.planCode,
        amountXof: args.amountXof,
        updatedAt: now,
      })
    }
    return null
  },
})

/**
 * `internal.paystackPlans.planCodeMap` : map `planKey -> plan_code` lue depuis
 * `billingPlans`. Vide si les Plans ne sont pas encore provisionnés. Consommée
 * par le checkout (`paystack.startCheckout`) pour décider natif vs ponctuel.
 */
export const planCodeMap = internalQuery({
  args: {},
  handler: async (ctx): Promise<PlanCodeMap> => {
    const rows = await ctx.db.query('billingPlans').collect()
    const map: PlanCodeMap = {}
    for (const r of rows) map[r.planKey] = r.planCode
    return map
  },
})

/** Recherche un Plan existant par son `name` convenu (idempotence). */
async function findPlanCode(
  key: string,
  name: string,
): Promise<string | null> {
  // perPage large : le catalogue Filon tient en une page (8 plans).
  const res = await fetch(`${PAYSTACK_BASE}/plan?perPage=100`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  if (!res.ok) return null
  const json = (await res.json()) as ListPlansResponse
  if (!json.status || !Array.isArray(json.data)) return null
  const found = json.data.find((p) => p.name === name && p.plan_code)
  return found?.plan_code ?? null
}

/** Crée un Plan Paystack pour un couple donné et renvoie son `plan_code`. */
async function createPlan(
  key: string,
  plan: PaidPlan,
  interval: Interval,
): Promise<string | null> {
  const amountXof = priceXof(plan, interval)
  const res = await fetch(`${PAYSTACK_BASE}/plan`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: paystackPlanName(plan, interval),
      // XOF × 100 (exigence Paystack, devise pourtant zéro décimale).
      amount: toPaystackSubunit(amountXof),
      // 'monthly' | 'annually' (mapping Filon 'annual' → Paystack 'annually').
      interval: paystackInterval(interval),
      currency: 'XOF',
      // PAS d'`invoice_limit` : on veut une récurrence indéfinie.
    }),
  })
  const json = (await res.json()) as CreatePlanResponse
  if (!res.ok || !json.status || !json.data?.plan_code) return null
  return json.data.plan_code
}

/**
 * `internal.paystackPlans.ensurePlans` : provisionne les 8 Plans Paystack de
 * façon IDEMPOTENTE (cherche par `name` avant de créer) et cache les `plan_code`
 * dans `billingPlans`. Sans clé configurée : no-op (renvoie `created: 0`), pour
 * rester sans effet tant que la clé n'est pas posée.
 *
 *   npx convex run paystackPlans:ensurePlans
 */
export const ensurePlans = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ ensured: number; created: number; skipped: number }> => {
    const key = secretKey()
    if (!key) return { ensured: 0, created: 0, skipped: 0 }

    let ensured = 0
    let created = 0
    let skipped = 0

    for (const { plan, interval } of PLAN_COMBOS) {
      const name = paystackPlanName(plan, interval)
      const planKey = planKeyOf(plan, interval)
      let planCode = await findPlanCode(key, name)
      if (planCode) {
        skipped += 1
      } else {
        planCode = await createPlan(key, plan, interval)
        if (planCode) created += 1
      }
      if (!planCode) continue
      await ctx.runMutation(internal.paystackPlans.upsertPlanCode, {
        planKey,
        plan,
        interval,
        planCode,
        amountXof: priceXof(plan, interval),
      })
      ensured += 1
    }

    return { ensured, created, skipped }
  },
})
