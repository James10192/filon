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

// Construit dynamiquement la liste des providers sociaux : on n'active un
// provider QUE si ses deux variables d'environnement sont posées, pour ne pas
// casser le déploiement tant que les secrets OAuth ne sont pas configurés.
type OAuthCreds = { clientId: string; clientSecret: string }

type OAuthProviderConfig = OAuthCreds & {
  // RAFRAICHISSEMENT A LA CONNEXION : a chaque sign-in social, Better Auth
  // re-ecrit `user.image`/`name` depuis le profil du provider (Google `picture`,
  // GitHub `avatar_url`). Cf. `node_modules/better-auth/dist/oauth2/link-account.mjs`
  // (handleOAuthUserInfo -> `if (overrideUserInfo) internalAdapter.updateUser`),
  // declenche depuis `api/routes/callback.mjs` avec
  // `overrideUserInfo: provider.options?.overrideUserInfoOnSignIn`.
  overrideUserInfoOnSignIn: boolean
}

function buildSocialProviders(): Record<string, OAuthProviderConfig> {
  const providers: Record<string, OAuthProviderConfig> = {}

  const googleId = process.env.GOOGLE_CLIENT_ID
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET
  if (googleId && googleSecret) {
    providers.google = {
      clientId: googleId,
      clientSecret: googleSecret,
      overrideUserInfoOnSignIn: true,
    }
  }

  const githubId = process.env.GITHUB_CLIENT_ID
  const githubSecret = process.env.GITHUB_CLIENT_SECRET
  if (githubId && githubSecret) {
    providers.github = {
      clientId: githubId,
      clientSecret: githubSecret,
      overrideUserInfoOnSignIn: true,
    }
  }

  return providers
}

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

        // On construit l'objet sans cle `undefined` (regle Convex : ne jamais
        // passer `undefined` en argument). `image` provient du provider social
        // (Google `picture` / GitHub `avatar_url`, mappes par Better Auth).
        const name = (authUser as { name?: string }).name
        const image = (authUser as { image?: string }).image
        const row: {
          authId: string
          email: string
          createdAt: number
          name?: string
          image?: string
        } = {
          authId: authUser._id,
          email: (authUser as { email?: string }).email ?? '',
          createdAt: Date.now(),
        }
        if (name) row.name = name
        if (image) row.image = image

        await ctx.db.insert('users', row)

        // Équipe : relie les invitations en attente adressées à cet e-mail en
        // renseignant le `userId` (la lecture transversale pourra résoudre le
        // membre). Le statut reste 'pending' : l'acceptation demeure explicite.
        const email = row.email.toLowerCase()
        if (email) {
          const pending = await ctx.db
            .query('memberships')
            .withIndex('by_email', (q) => q.eq('email', email))
            .collect()
          for (const m of pending) {
            if (!m.userId) await ctx.db.patch(m._id, { userId: authUser._id })
          }
        }
      },
      // Propage les changements Better Auth (nom, photo) vers la ligne metier.
      // C'est ce trigger qui realise le RAFRAICHISSEMENT social : a chaque
      // sign-in, `overrideUserInfoOnSignIn` met a jour l'utilisateur Better Auth,
      // ce qui declenche cet `onUpdate`. On NE remplace PAS une photo importee a
      // la main (flag `customImage`).
      onUpdate: async (ctx, newDoc) => {
        const doc = await ctx.db
          .query('users')
          .withIndex('by_authId', (q) => q.eq('authId', newDoc._id))
          .unique()
        if (!doc) return

        const name = (newDoc as { name?: string }).name
        const image = (newDoc as { image?: string }).image
        const patch: { name?: string; image?: string } = {}
        if (name && name !== doc.name) patch.name = name
        // Sync de la photo sociale uniquement si l'utilisateur n'a pas impose
        // sa propre photo (sinon on ecraserait son choix a chaque connexion).
        if (!doc.customImage && image && image !== doc.image) {
          patch.image = image
        }
        if (Object.keys(patch).length > 0) await ctx.db.patch(doc._id, patch)
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
    // Providers OAuth (Google, GitHub) ajoutés seulement si leurs secrets sont
    // posés (cf. buildSocialProviders). Les boutons sociaux côté client
    // resteront inopérants tant que les secrets ne sont pas configurés.
    socialProviders: buildSocialProviders(),
    account: {
      // Liaison de comptes : si un utilisateur a déjà un compte (e-mail/mot de
      // passe) et se connecte avec Google/GitHub sur la même adresse e-mail
      // vérifiée, les comptes sont automatiquement liés au lieu d'en créer un
      // nouveau. Google et GitHub sont déclarés providers de confiance.
      accountLinking: {
        enabled: true,
        trustedProviders: ['google', 'github'],
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    plugins: [convex({ authConfig })],
  })

export type { Id }
