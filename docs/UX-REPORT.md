# Filon · rapport d'intégration UX

Revue de cohérence statique (sans build) après passage de plusieurs agents sur
l'UI. Objectif : un atelier dense façon Linear / Attio, sobre, clavier-first,
sans rien casser de l'auth / SSR / build.

## 1. Résumé des changements par surface

### Coquille applicative (`src/routes/app/route.tsx`)
- Shell restructuré visuellement : sidebar groupée par domaine (Pilotage /
  Pipeline / Carnet / Réglages), badges live sur « Relances » (retard = danger,
  à venir = accent), bouton « Nouvelle opportunité » en tête de sidebar et dans
  la topbar, champ de recherche dans la topbar qui ouvre la palette (Cmd/Ctrl+K),
  raccourci « n » pour la capture rapide.
- Logique d'authentification **intacte** : `AppLayout → ConvexProviders
  (ConvexProvider au SSR puis ConvexBetterAuthProvider au montage) → AuthGate
  (useSession + redirection /connexion) → AppShell`. Les providers Theme /
  QuickCapture / CommandPalette sont montés dans la zone authentifiée, jamais
  dans `__root.tsx`.

### Tableau de bord (`src/routes/app/index.tsx`)
- Remplacement des 8 KPI de poids égal par : hero entonnoir (`PipelineFunnel`),
  grille « Priorités du jour » (`TodayStack`) + activité récente
  (`RecentActivity`), puis KPI secondaires compacts (`SecondaryKpis`).
- États gérés : loading (skeletons dédiés), empty (onboarding), error
  (`DashboardError` avec retry).

### Opportunités (`src/routes/app/opportunites.tsx`)
- Grille de cartes remplacée par un tableau dense (`OpportunitiesTable`) : tri
  par colonne, chip d'étape cliquable inline (`StageChipSelect` →
  `api.opportunities.setStage`, optimiste + toast), filtres Stage / Type /
  recherche construits dynamiquement (pas d'arg `undefined` Convex).

### Pipeline / pages secondaires
- Pipeline, Entreprises, Propositions, Relances, Documents, Paramètres :
  toutes passées sous `PageToolbar` (titre 19px semibold tracking -0.02em,
  rythme `gap-5`, séparateur bas).

### Primitives ajoutées (`src/components/app/`)
- `page-toolbar.tsx` · `command-palette.tsx` · `quick-capture.tsx` · `theme.tsx`

### Backend (`convex/dashboard.ts`)
- Ajout de la query `api.dashboard.funnel` (compte + valeur cumulée par étape,
  totaux actifs / gagnés) consommée par le hero. `summary` / `pipeline` /
  `upcomingActions` / `recentActivity` conservées. Helpers `parseCompensation`,
  `ACTIVE_STAGES`, `loadOpportunities` présents et cohérents.

### Composants supprimés (remplacés)
- `dashboard/kpi-card.tsx`, `dashboard/stage-breakdown.tsx`,
  `dashboard/followups-due.tsx` : supprimés, **aucune référence résiduelle** dans
  `src/` (vérifié).

## 2. Corrections d'intégration appliquées dans cette revue

| Fichier | Problème | Correction |
|---|---|---|
| `components/opportunities/opportunities-table.tsx` | tiret long `—` (placeholder valeur vide) | remplacé par `·` (séparateur neutre du projet) |
| `components/opportunities/stage-chip-select.tsx` | toasts sans accents (« Etape changee », « echoue ») | « Étape changée », « échoué » |
| `routes/app/entreprises.tsx` | sous-titre sans accents | « ciblées … reliés à vos opportunités » |
| `routes/app/propositions.tsx` | sous-titre sans accents | « spontanées … démarchage … à la signature » |
| `routes/app/documents.tsx` | sous-titre sans accents | « bibliothèque … prête à accompagner » |
| `components/app/command-palette.tsx` | labels visibles sans accents | « Opportunités », « Paramètres » (keywords laissés sans accent : `normalize()` les ignore) |

## 3. Vérifications passées (statique)

- **Fichiers interdits NON modifiés** : `convex/auth.ts`, `convex/auth.config.ts`,
  `convex/http.ts`, `convex/schema.ts`, `src/lib/auth/*`,
  `src/routes/__root.tsx`, `src/router.tsx`, `src/react-global.ts`,
  `vite.config.ts` (git diff vide sur ces chemins). PASS
- **Logique AuthGate / ConvexProviders / useSession** dans `route.tsx` : intacte
  (seul le visuel du shell autour a évolué). PASS
- **PageToolbar** : utilisé sur toutes les pages liste/section (`index`,
  `opportunites`, `pipeline`, `entreprises`, `propositions`, `relances`,
  `documents`, `parametres`). La fiche détail `opportunites.$id.tsx` n'en met pas
  (en-tête contextuel propre via chips) : acceptable, ce n'est pas une page liste.
  PASS
- **Imports primitives** : tous les imports `~/components/app/*` et composants
  domaine résolvent vers des fichiers existants. Aucun import cassé. PASS
- **Args Convex** : `opportunites` construit `queryArgs` dynamiquement (jamais
  `undefined`) ; `api.dashboard.funnel`, `api.followups.upcoming {withinDays:0}`,
  `api.followups.overdue` valides vs API-CONTRACT. PASS
- **Tokens d'étape** : chips via `bg-stage-*` / `text-stage-*` (meta.ts) et
  `var(--color-stage-*)` (pipeline-meta.ts). Aucune couleur hex inventée. PASS
- **Tiret long `—`** : plus aucun dans du texte FR visible (`src/`). Les `—`
  restants sont en commentaires JSDoc de `convex/followups.ts` (non visibles). PASS

## 4. Checklist de vérification pour l'humain

- [ ] `pnpm typecheck` (vérifie notamment le cast `as Funnel` de pipeline-funnel
      et le contrat de `api.dashboard.funnel`).
- [ ] `pnpm build` (SSR/Vite : aucun fichier interdit touché, risque faible).
- [ ] **Redéployer Convex** : `npx convex deploy` (ou `npx convex dev`) car
      `convex/dashboard.ts` a été modifié (nouvelle query `funnel`). Sans cela,
      le hero du dashboard restera en skeleton (query introuvable).
- [ ] `vercel` : redéploiement front une fois typecheck + build OK.
- [ ] Vérif visuelle **avec données peuplées** : hero entonnoir, tableau
      opportunités dense, badges sidebar relances, palette Cmd/Ctrl+K, capture « n ».
- [ ] Vérif visuelle **dark mode** (toggle dans la sidebar / mobile).
- [ ] Mobile : touch targets ≥ h-11, sheet de navigation, topbar.

## 5. État final et risques résiduels

État : intégration cohérente, design non refait, corrections limitées aux
incohérences (tirets longs, accents, vérif imports/args/tokens).

Risques résiduels :
1. **Redéploiement Convex obligatoire** : `api.dashboard.funnel` est nouveau côté
   backend ; le front l'appelle déjà. Sans `npx convex deploy`, le dashboard
   reste en chargement. C'est le seul point bloquant fonctionnel.
2. **Typecheck non exécuté ici** (consigne : pas de build). Le cast
   `as Funnel | undefined` masque une éventuelle dérive de forme entre
   `dashboard.funnel` et le type local `Funnel` de `pipeline-funnel.tsx` ;
   ils correspondent à la lecture, mais à confirmer au `pnpm typecheck`.
3. **`followups.upcoming {withinDays:0}`** dans `today-stack` : volontaire
   (relances dues aujourd'hui / dépassées). À confirmer visuellement que le
   « stack du jour » liste bien ce qui est attendu.
4. Accents non touchés ailleurs : les commentaires de code et les `keywords` de
   la palette restent sans accents (sans impact UI visible).
