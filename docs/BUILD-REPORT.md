# Filon · rapport d'intégration et de revue

> Revue de cohérence statique réalisée sans build (node_modules et
> `convex/_generated/` absents, normal : l'humain installe ensuite). Objectif :
> garantir que chaque route consomme des fonctions Convex réellement définies,
> que la nav pointe vers des routes existantes, que les imports résolvent, et
> qu'aucun texte FR ne contient de tiret long.

## État du build

- Stack alignée à 100 % sur byoma-website (prod) : `package.json`,
  `vite.config.ts` (ordre `tailwindcss → tanstackStart → viteReact → nitro`,
  `dedupe react/react-dom`, `ssr.noExternal` Convex/Better Auth), `tsconfig.json`
  (alias `~/*`), `convex/convex.config.ts`, `convex/auth.ts`,
  `convex/auth.config.ts`, `convex/http.ts`, `src/router.tsx` (export `getRouter`,
  pas `createRouter`), `src/lib/auth/auth-client.ts`. Aucun écart à corriger.
- Provider Convex/Auth scoppé au layout `/app` (`src/routes/app/app.tsx`,
  `ConvexBetterAuthProvider`), jamais dans `__root.tsx` (conforme au gotcha
  TanStack Start). `__root.tsx` ne monte que `<Toaster />`.
- Backend Convex (8 domaines) : multi-tenant strict respecté partout. Chaque
  query/mutation commence par `requireUser(ctx)` et lit via un index `by_user*`.
  Aucune lecture/écriture sans filtre `userId`. Vérification de propriété avant
  tout `patch`/`delete`/lecture par id. Objets d'insert/patch construits
  dynamiquement (jamais `undefined`). Messages d'erreur en français.
- Côté client : aucun argument `undefined` passé à une fonction Convex (vérifié
  sur tous les `useQuery`/`useMutation`). Tous les imports `~/components/ui/*`
  résolvent (barrel `ui/index.ts` complet et fichiers présents).

## Fichiers clés

| Rôle | Fichier |
|---|---|
| Contrat d'API (source de vérité) | `docs/API-CONTRACT.md` |
| Schéma Convex (multi-tenant `userId`) | `convex/schema.ts` |
| Helper d'auth | `convex/lib/withUser.ts` (`requireUser`, `withUserQuery/Mutation`) |
| Auth single-store + trigger `user.onCreate` | `convex/auth.ts` |
| Domaines Convex | `convex/{opportunities,activities,companies,contacts,followups,proposals,documents,dashboard,settings,users}.ts` |
| Layout app + nav + provider | `src/routes/app/app.tsx` |
| Routes app | `src/routes/app/{index,pipeline,opportunites,opportunites.$id,entreprises,propositions,app.relances,documents,parametres}.tsx` |
| Routes publiques | `src/routes/{index,connexion,inscription}.tsx`, `src/routes/api/auth.$.tsx` |

## Mismatches trouvés et corrigés

1. **`convex/users.ts` manquant (BLOQUANT, corrigé).**
   `src/components/settings/profile-section.tsx` consomme `api.users.me` et
   `api.users.updateProfile`, définis au contrat (section « users ») mais le
   fichier `convex/users.ts` n'existait pas. Sans lui, `convex/_generated/api`
   n'aurait pas exposé `api.users.*` et la page Paramètres aurait planté au
   typecheck et au runtime.
   → Créé `convex/users.ts` conforme au contrat :
   - `me` (query, args `{}`) : profil du user courant via index `by_authId`,
     retourne `null` si non authentifié (ne throw pas), avec filet de sécurité
     si la ligne `users` n'a pas encore été créée par le trigger `onCreate`
     (expose au moins l'e-mail d'auth).
   - `updateProfile` (mutation, args `{ name?, headline? }`) : patch dynamique
     (jamais `undefined`), valide le nom non vide, crée la ligne si absente.
   - Multi-tenant strict (`requireUser` + index `by_authId`), forme de retour
     compatible avec le type `Profile` attendu côté client
     (`{ email?, name?, headline? }`).

2. **Tirets longs (—) dans des textes affichés (corrigé).**
   9 occurrences dans des titres de page `<title>` (meta `head()`), toutes
   visibles dans l'onglet du navigateur, remplacées par le point médian `·` :
   `__root.tsx`, `app/app.tsx`, `app/index.tsx`, `app/pipeline.tsx`,
   `app/opportunites.tsx`, `app/opportunites.$id.tsx`, `app/entreprises.tsx`,
   `app/propositions.tsx`, `app/documents.tsx`.
   Aucun tiret long restant dans `src/` (UI). Restent quelques `—` dans des
   commentaires de `convex/followups.ts` et dans `docs/DESIGN.md` : non
   affichés à l'utilisateur, non corrigés (hors texte FR visible), à nettoyer
   au besoin par l'auteur du domaine.

## Vérifications passées (aucune correction nécessaire)

- **Toutes les fonctions Convex consommées existent** avec les bons noms/args :
  `opportunities.{list,board,get,create,update,move,reorder,setStage,remove}`,
  `activities.{listByOpportunity,recent,add,remove}`,
  `companies.{list,create,update,remove}` + `contacts.countOpportunitiesByCompany`,
  `contacts.{list,create,update,remove}`,
  `followups.{list,due,upcoming,overdue,create,toggle,remove}`,
  `proposals.{list,create,update,setStatus,remove}`,
  `documents.{list,create,update,remove,generateUploadUrl}`,
  `dashboard.summary`, `settings.{get,upsert}`, `users.{me,updateProfile}`.
  Note : la page Relances consomme `followups.due` (groupes overdue / today /
  thisWeek / later), bien présent dans `convex/followups.ts` au-delà du strict
  contrat ; le dashboard utilise `followups.overdue` + `followups.upcoming` +
  `activities.recent`. Tous présents.
- **Nav du layout** (`src/routes/app/app.tsx`) : les 8 liens
  (`/app`, `/app/pipeline`, `/app/opportunites`, `/app/entreprises`,
  `/app/propositions`, `/app/relances`, `/app/documents`, `/app/parametres`)
  pointent vers des routes dont l'ID `createFileRoute(...)` correspondant existe.
- **Pas de double définition de route** : chaque ID `createFileRoute` est unique.
- **Imports** : tous les chemins `~/...` et `../../../convex/_generated/...`
  pointent vers des cibles existantes (les `_generated/*` seront produits par
  `npx convex codegen`).

## Checklist de mise en route (humain)

```bash
cd C:/Users/yabla/Downloads/dev/filon

# 1. Dépendances (pnpm exclusivement)
pnpm install

# 2. Configurer / lier le déploiement Convex (interactif)
npx convex dev --configure
#  → crée le projet, renseigne CONVEX_DEPLOYMENT, VITE_CONVEX_URL,
#    VITE_CONVEX_SITE_URL dans .env.local

# 3. Secrets Better Auth (côté Convex) + URL du site
npx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
npx convex env set SITE_URL http://localhost:3000
#  (en prod : npx convex env set SITE_URL https://filon.vercel.app)

# 4. Générer les types Convex (_generated/) si pas déjà fait par `convex dev`
npx convex codegen

# 5. Lancer en dev (laisser `npx convex dev` tourner dans un terminal séparé)
pnpm dev
#  → http://localhost:3000

# 6. Typecheck (après codegen, sinon erreurs sur _generated/*)
pnpm typecheck
```

### Déploiement (après validation locale)

```bash
# Backend Convex (prod)
npx convex deploy
npx convex env set SITE_URL https://<domaine-vercel> --prod   # selon besoin

# Frontend (Vercel, preset nitro déjà configuré : NITRO_PRESET=vercel par défaut)
vercel            # preview
vercel --prod     # production
#  Renseigner dans Vercel les env : VITE_CONVEX_URL, VITE_CONVEX_SITE_URL,
#  SITE_URL (et CONVEX_DEPLOY_KEY pour le build si CI).
```

## Risques résiduels à vérifier au premier build

1. **Nommage des fichiers de routes sous `src/routes/app/` (à surveiller).**
   Le layout est `src/routes/app/app.tsx` (ID `/app`) et l'index
   `src/routes/app/index.tsx` (ID `/app/`), mais les enfants mélangent deux
   styles : la plupart sont « plats dans le dossier » (`pipeline.tsx`,
   `opportunites.tsx`, `entreprises.tsx`, `propositions.tsx`, `documents.tsx`,
   `parametres.tsx`, `opportunites.$id.tsx`) tandis que les relances sont
   préfixées (`app.relances.tsx`). Les chaînes `createFileRoute('/app/...')`
   sont, elles, toutes cohérentes. Le `routeTree.gen.ts` n'existant pas encore,
   c'est le plugin TanStack qui tranchera au premier `pnpm dev`/`pnpm build` :
   il peut émettre un warning et réécrire la chaîne d'ID à partir du chemin de
   fichier. Vérifier au premier build qu'aucune route ne « disparaît » (warning
   « does not export a Route » / route inattendue) et que `/app/relances` et le
   layout `/app` se montent bien. Non corrigé ici car le layout `/app` et la
   structure de routing sont hors périmètre (fichiers d'un autre agent). Si le
   plugin génère un arbre incorrect : harmoniser en `route.tsx` pour le layout
   ou en nommage plat homogène pour tous les enfants.
2. **Trigger `user.onCreate`.** La ligne métier `users` est créée à
   l'inscription par le trigger Better Auth. `users.me`/`updateProfile` gèrent
   le cas où elle n'existe pas encore (juste après signup), mais vérifier au
   premier parcours d'inscription que la ligne apparaît bien (sinon le profil
   se crée au premier `updateProfile`).
3. **`convex/_generated/` absent.** Tous les imports
   `../../../convex/_generated/{api,dataModel,server}` échoueront au typecheck
   tant que `npx convex codegen` (ou `npx convex dev`) n'a pas tourné. C'est
   attendu ; lancer le codegen avant `pnpm typecheck`.
4. **`expectAuth: false` dans `src/router.tsx`.** Identique à byoma : le client
   Convex se connecte sans auth au niveau routeur, l'auth est portée par le
   provider scoppé `/app`. À vérifier si une route `/app` doit lire des données
   authentifiées dès le SSR (le pattern byoma le gère côté client après
   hydratation).
5. **Tirets longs restants hors UI.** Quelques `—` subsistent dans des
   commentaires (`convex/followups.ts`) et `docs/DESIGN.md` ; sans impact
   utilisateur, à nettoyer par l'auteur si on veut une cohérence stricte.
```
