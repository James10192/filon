import {
  AuthFunctions,
  createClient,
  type GenericCtx,
} from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { betterAuth } from 'better-auth/minimal'
import { components, internal } from './_generated/api'
import type { DataModel, Id } from './_generated/dataModel'
import authConfig from './auth.config'

const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000'

const authFunctions: AuthFunctions = internal.auth as AuthFunctions

export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {
    user: {
      // À la création d'un compte Better Auth, on crée la ligne métier `users`.
      // `authId` = identifiant Better Auth, c'est aussi la valeur de `userId`
      // utilisée pour scoper toutes les tables métier (cf. convex/lib/withUser).
      onCreate: async (ctx, authUser) => {
        const existing = await ctx.db
          .query('users')
          .withIndex('by_authId', (q) => q.eq('authId', authUser._id))
          .unique()
        if (existing) return

        await ctx.db.insert('users', {
          authId: authUser._id,
          email: (authUser as { email?: string }).email ?? '',
          name: (authUser as { name?: string }).name ?? undefined,
          createdAt: Date.now(),
        })
      },
    },
  },
})

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi()

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    trustedOrigins: [siteUrl, 'http://localhost:3000'],
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 8,
      requireEmailVerification: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    plugins: [convex({ authConfig })],
  })

export type { Id }
