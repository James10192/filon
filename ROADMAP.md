# Filon · Roadmap produit

> Source de vérité du plan produit. Mise à jour à chaque livraison de phase.
> Établie le 2026-06-14 à l'issue d'un cadrage complet (8 décisions actées ci-dessous).

## Vision

Filon passe d'un outil perso de prospection à un **SaaS commercial**.
Cible à terme : **multi-segment** (indépendants, agences/équipes, entreprises).
Démarrage : **indépendant solo payant**, c'est-à-dire le produit qui existe déjà,
monétisé per-user, sans rien casser. On ne paie le coût des fonctionnalités lourdes
(orgs, IA) que quand elles sont justifiées.

## Journal de décisions (cadrage 2026-06-14)

1. **Direction** : cible multi-segment, **démarrage solo commercial**. Le premier client payant est l'indépendant solo.
2. **Échelle de valeur** : Gratuit (manuel plafonné) → Premium (automatisation illimitée) → Super premium (IA métrée à l'acte) → **Copilot (IA agentique, nouveau 5e tier)** → Entreprise (orgs). La **veille automatique = plomberie déterministe** (pas d'IA) ; l'IA, c'est comprendre (scoring sémantique) et générer (brouillons), à coût variable donc **métrée**.
3. **Paiements** : **Paystack** (couvre la Côte d'Ivoire + XOF + Wave / Orange Money / MTN MoMo + carte). Facturation **maison** côté Convex (le plugin `stripe` de Better Auth n'est pas supporté par le composant NPM). Webhook signé Paystack → http action Convex qui pose le tier.
4. **Orgs** : une org = **agence/équipe partageant UN pipeline** (pas du multi-sièges creux, pas un ATS entreprise). **Différée** à un déclencheur (vrai prospect équipe). Le jour venu : **Local Install de Better Auth** (décision figée pour éviter une 2e migration).
5. **Espace Opportunités** : **fusion** de Pipeline + Opportunités en un seul espace avec sélecteur de vue **Liste / Tableau / Calendrier**, et **panneau split master-detail** partagé (liste/board à gauche, détail à droite, deep-link URL, sheet plein écran sur mobile). Même pattern décliné ensuite sur l'espace **Propositions**.
6. **Facturation** : **récurrent mensuel + annuel** (annuel = 2 mois offerts). Pas d'essai limité au début (le gratuit est l'entonnoir). Grille de départ ci-dessous, ajustable.
7. **Phasage** : UX d'abord (maintenant) → billing en test mode pendant la review Paystack → IA à l'acte → **Copilot IA agentique** → orgs au déclencheur.
8. **Suivi** : ce `ROADMAP.md` (source de vérité) + **milestones GitHub** (1 par phase).

### Décisions complémentaires (2026-06-14, fin de journée)

9. **i18n complet** : passage **en/fr** sur tout le produit (site + app) via **Paraglide** (compile-time, zéro runtime). Chantier solo, jamais en parallèle (touche presque tous les fichiers).
10. **Docs** : documentation produit dans un **repo séparé** (`filon-docs`, **Astro Starlight** — i18n, dark/light et recherche natifs). Parallèle-safe, hors du dépôt app.
11. **Thème du site** : **clair/sombre** avec **défaut système + toggle persistant**, appliqué site-wide. Landing v2 inspirée Zed (clair par défaut).
12. **Tier IA dédié** : l'IA agentique (copilot in-app) est un **5e palier séparé AU-DESSUS de Pro+ IA** (ex. « Filon Copilot »), pas une option de Pro+ IA. Modèles à l'étude (cf. Phase IA) ; choix du modèle / possibilité de laisser l'utilisateur choisir **en cours d'arbitrage**.
13. **/admin + feedback** : un back-office **/admin** (gérer users/orgs, métriques, feedbacks) et un **système de feedback in-app** sont actés **pour la Phase 4**.

## Grille tarifaire (XOF, ancres de départ)

| Palier | Mensuel | Annuel (2 mois offerts) | Débloque |
|---|---|---|---|
| **Découverte** (gratuit) | 0 | 0 | Pipeline, saisie manuelle, ~25 opportunités, 1 veille, import manuel |
| **Pro** (premium) | ~3 500 XOF | ~35 000 XOF | Opportunités illimitées, veille auto + recherches multiples, vues multiples, analytique, relances, export |
| **Pro+ IA** (super premium, à l'acte) | ~9 000 XOF | ~90 000 XOF | Tout Pro + IA à l'acte (scoring de pertinence, brouillons candidature/email/CV), quota de crédits IA/mois, au-delà à l'usage |
| **Copilot** (IA agentique, nouveau) | à définir (au-dessus de Pro+ IA) | à définir | Tout Pro+ IA + **copilot in-app** et IA agentique partout (chat, actions assistées). Coût modèle élevé → tier dédié, métré |
| **Équipe / Entreprise** (phase tardive) | par siège, sur devis | — | Orgs, pipeline partagé, rôles |

Équivalents carte/international (Paystack gère l'USD) : Pro ≈ 5 $/mois, Pro+ ≈ 13 $/mois. Tarif Copilot à fixer selon le coût modèle retenu.

## État actuel (base technique)

- Mono-utilisateur strict : chaque table porte `userId` (id Better Auth), scopée via `withUser`/`requireUser`.
- Auth : `@convex-dev/better-auth` (composant NPM), plugins : `convex` uniquement. Pas de plugin `organization`.
- Veille educarriere : cron Convex (fetch + parse + match mots-clés + dédup), import universel (URL/texte). Déterministe, pas d'IA.
- Déployé : Convex prod `decisive-mongoose-364`, front `filon-xi.vercel.app` (Vercel, Nitro preset).

---

## Phases

### Phase 1 — Espace Opportunités unifié (UX) · LIVRÉ
Zéro dépendance externe, buildable tout de suite.

- [x] Fusionner Pipeline + Opportunités en un espace unique avec sélecteur de vue — livré 2026-06-14
- [x] Vue **Liste** (table dense, tri/filtre, chips de filtres actifs) — livré 2026-06-14
- [x] Vue **Tableau** (kanban dnd-kit) intégrée au switcher — livré 2026-06-14
- [x] Vue **Calendrier** (échéances `deadline`/`nextActionAt` + relances) — livré 2026-06-14
- [x] **Panneau split master-detail** (deep-link URL, sheet plein écran mobile) — livré 2026-06-14
- [x] Nettoyage nav sidebar + cibles ⌘K cohérentes — livré 2026-06-14

#### Chantiers UX livrés en marge (non tracés en milestone)
- [x] **Landing v2 « Zed »** : refonte scroll-story (hero, problème, piliers, showcase, preuve, CTA), hero centré, titre dégradé, glow centré, showcase en tab-switcher (sans pin), spotlight, mobile sans overflow, orchestration GSAP (gsap brut + code-split, reduced-motion) — livré 2026-06-14
- [x] **Thème clair/sombre site-wide** : défaut système + toggle persistant — livré 2026-06-14
- [x] **Polish global** : `cursor: pointer` sur les boutons (régression Tailwind v4), dropdowns non-modaux + `scrollbar-gutter` (anti layout-shift), scrollbar custom — livré 2026-06-14

### Espace Propositions unifié (UX) · EN COURS
Même pattern que l'espace Opportunités, appliqué aux propositions/devis.

- [ ] Vues multiples (liste / tableau / cartes) via un view-switcher dédié
- [ ] Panneau split master-detail (détail + actions de proposition)

### Phase 2 — Abonnements & paliers (Paystack, test mode)
Pendant la review Paystack (~7 j). Tout testable sans charge réelle, bascule live keys à l'activation.

- [x] Champ `plan` sur `users` (`free` / `pro` / `pro_ai`) + `planInterval`, `planRenewsAt`, `subscriptionRef`, `paystackCustomerCode` (additif, défaut `free`) — livré 2026-06-14
- [x] **Helper de gating central** (`convex/lib/plan.ts` + miroir client : plafond 25 opportunités actives, 1 veille, import manuel ; cron veille saute les users gratuits) — livré 2026-06-14
- [x] Page **Tarifs** `/app/tarifs` (mensuel/annuel, XOF, comparatif paliers, palier courant, CTA upgrade) — livré 2026-06-14
- [x] Intégration **Paystack test mode** : Initialize Transaction + Verify (action serveur, clé secrète en env Convex, XOF ×100, channels carte+mobile money) — livré 2026-06-14
- [x] **Webhook signé** Paystack → http action Convex `/paystack/webhook` (vérif HMAC-SHA512 du corps brut) qui pose le tier — livré 2026-06-14
- [x] Application des limites dans les mutations (create opportunité/veille) + UI d'upsell (toast → /app/tarifs) + badge de palier dans les réglages — livré 2026-06-14
- [x] **Cycle de vie d'abonnement** : champs additifs `autoRenew` + `pendingPlan` + `renewalReminderAt` sur `users` (#17) — livré 2026-06-14
- [x] **Cron d'échéance quotidien** : applique le `pendingPlan` programmé à l'échéance, sinon rétrograde en `free` (paiement ponctuel = pas de récurrence réelle, cf. #21) ; relance les abonnements à terme sous 3 j (`flagRenewalReminders`, point d'accroche e-mail) (#18) — livré 2026-06-14
- [x] **Upgrade / downgrade / annulation / réactivation** : upgrade via nouveau paiement (immédiat, efface tout pending) ; downgrade `scheduleDowngrade` (pro_ai→pro à l'échéance) ; `cancelAutoRenew` (accès maintenu jusqu'à l'échéance puis `free`) ; `reactivateAutoRenew` dans la période payée (#19) — livré 2026-06-14
- [x] **Section « Gérer mon abonnement »** (réglages) : palier, échéance `.assay`, état du renouvellement, changement programmé, actions (changer de palier / programmer downgrade / annuler / réactiver) avec AlertDialog de confirmation (#20) — livré 2026-06-14
- [ ] Bascule clés live à l'activation du compte (action Marcel : `npx convex env set PAYSTACK_SECRET_KEY …` + enregistrer le webhook ; issue #12)

> Note récurrence : les vraies souscriptions Paystack (Plans + autorisation réutilisable) sont **carte uniquement**. Le mobile money (Wave / OM / MoMo) ne donne pas d'autorisation réutilisable : il est traité comme un **paiement ponctuel** couvrant la période choisie, avec relance de ré-abonnement à l'échéance. La copie de la page Tarifs le dit honnêtement.
> Webhook à enregistrer (dashboard Paystack) : `https://decisive-mongoose-364.convex.site/paystack/webhook`.

#### Conversion intelligente (couche d'upsell, anti-nag)
Vendre le résultat au moment de la valeur ou de la friction, jamais à froid. Tier-aware : free → push Pro ; pro → teasers Pro+ IA sur l'IA uniquement ; pro_ai → rien.

- [x] **Cerveau central** `useUpsell()` + catalogue déclaratif (`conversion.ts`) + mémoire de dismissal & cap journalier (`dismissal.ts`, localStorage) — livré 2026-06-14
- [x] **Composants réutilisables** : `<LockedFeature>` (ghosting + badge), `<UpgradeNudge>` (bandeau dismissible), `<UsageMeter>` (compteur `.assay` qui escalade), `<UpgradeDialog>` (surface d'upgrade unique) — livré 2026-06-14
- [x] **Hooks par page** : veille auto verrouillée (hook fort), compteur d'opportunités actives + score IA teasé (Opportunités), brouillon IA teasé (détail), bandeau contextuel unique (dashboard), entrée « Améliorer » discrète (menu) — livré 2026-06-14
- [x] **Déclencheurs de valeur mérités** : nudge après un import réussi et après une opportunité gagnée — livré 2026-06-14
- [x] **GSAP de séduction** (<300ms, reduced-motion respecté) sur les teasers verrouillés et l'entrée des nudges de valeur uniquement — livré 2026-06-14

### Phase 3 — Super premium IA (à l'acte)
Industrialise le savoir-faire manuel (kits de candidature). Coût variable → métrage. IA déclenchée par l'utilisateur, à l'acte (pas d'agent autonome ici).

- [ ] Scoring de pertinence d'une opportunité vs profil
- [ ] Brouillon auto lettre / email / CV ciblé par opportunité
- [ ] Quota de crédits IA/mois par palier + métrage + au-delà à l'usage
- [ ] Matching sémantique veille (au-delà du mot-clé)

### Phase IA — Copilot in-app & IA agentique (nouveau 5e tier)
Au-delà de l'IA à l'acte : une **IA agentique présente partout** dans l'app, débloquée par un **palier dédié AU-DESSUS de Pro+ IA** (« Filon Copilot »). v1 = chatbot copilote ; cible = actions assistées sur le pipeline, la veille et les propositions.

- [ ] Nouveau tier **Copilot** dans la grille + gating (au-dessus de Pro+ IA)
- [ ] Copilot in-app (chat) via **actions Convex scopées**, métré à l'usage
- [ ] IA agentique contextuelle dans les espaces (Opportunités, Propositions, Veille)
- [ ] **Choix de modèle (en cours d'arbitrage)** : Claude **Sonnet 4.6** (~3 $ / 15 $ par M tokens) pour le copilot, Claude **Haiku 4.5** (~1 $ / 5 $ par M tokens) pour le volume ; décision modèle figée vs choix laissé à l'utilisateur à trancher

### Phase 4 — Orgs, /admin & feedback (déclenchée par un prospect équipe)
Coût lourd, ne se lance qu'au déclencheur réel.

- [ ] **Local Install de Better Auth** + plugin `organization`
- [ ] Modèle org + membres + rôles (owner/membre)
- [ ] Re-scoping des tables métier par `orgId` (migration depuis `userId`)
- [ ] Pipeline partagé, invitations, tier Entreprise (par siège, sur devis)
- [ ] **Back-office `/admin`** : gérer users/orgs, métriques d'usage, consultation des feedbacks
- [ ] **Système de feedback in-app** : collecte des retours utilisateurs, remontée vers /admin

---

## Actions Marcel (hors agents)

- [ ] **Bascule clés live Paystack** à l'activation du compte : `npx convex env set PAYSTACK_SECRET_KEY sk_live_… --prod` + enregistrer le webhook live (`https://decisive-mongoose-364.convex.site/paystack/webhook`) — issue #12.
- [ ] **Suivi : vraies souscriptions carte tokenisées** (Plans Paystack + autorisation réutilisable, auto-renouvellement) à l'activation prod — issue #21.

## Suivi

- Ce fichier = plan + avancement (cases cochées + datées à chaque livraison).
- Milestones GitHub : Phase 1 (Opportunités unifié), Phase 2 (Abonnements Paystack), Phase 3 (IA à l'acte), Phase 4 (Orgs). La Phase IA (Copilot) et l'espace Propositions sont suivis ici en attendant leurs milestones dédiés.
