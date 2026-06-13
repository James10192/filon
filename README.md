# Filon

SaaS de pilotage des opportunités de revenu pour développeurs et freelances.
Centralise candidatures, propositions spontanées, prospection freelance et
missions dans un pipeline kanban, avec relances datées, contacts, entreprises,
documents et tableau de bord.

Multi-tenant par `userId` dès le premier jour.

## Stack

- **TanStack Start** (SSR, file-based routing) + **React 19** + **Vite 7** + **Nitro 3** (preset `vercel`)
- **Convex** (backend temps réel + storage)
- **Better Auth** sur Convex (single store, email/mot de passe)
- **Tailwind CSS v4** + **Radix UI** + **CVA** (shadcn-style)
- **lucide-react**, **zod**, **sonner**
- **pnpm**

## Démarrage

```bash
pnpm install
npx convex dev            # provisionne le backend + génère convex/_generated
pnpm dev                  # http://localhost:3000
```

Variables d'environnement : copier `.env.example` en `.env.local`.
Définir le secret Better Auth côté Convex :

```bash
npx convex env set BETTER_AUTH_SECRET $(openssl rand -base64 32)
npx convex env set SITE_URL http://localhost:3000
```

## Scripts

| Script | Rôle |
|---|---|
| `pnpm dev` | Serveur de développement (SSR) sur le port 3000 |
| `pnpm build` | Build de production (sortie `.output/`) |
| `pnpm start` | Lance le serveur Nitro buildé |
| `pnpm preview` | Prévisualisation du build |
| `pnpm typecheck` | Vérification TypeScript (`tsc --noEmit`) |

## Structure

```
convex/            backend Convex (schéma, auth, fonctions par domaine)
src/
  routes/          file-based routing (pages publiques + /app protégé)
  components/ui/   composants shadcn-style (Radix + CVA)
  lib/             helpers (auth client, cn, ...)
  styles/app.css   Tailwind v4 + tokens de design
docs/              contrats partagés entre agents (API, routes, design)
```

## Déploiement

```bash
npx convex deploy     # backend
vercel --prod         # front (Nitro, preset vercel)
```
