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
2. **Échelle de valeur** : Gratuit (manuel plafonné) → Premium (automatisation illimitée) → Super premium (IA métrée) → Entreprise (orgs). La **veille automatique = plomberie déterministe** (pas d'IA) ; l'IA, c'est comprendre (scoring sémantique) et générer (brouillons), à coût variable donc **métrée**.
3. **Paiements** : **Paystack** (couvre la Côte d'Ivoire + XOF + Wave / Orange Money / MTN MoMo + carte). Facturation **maison** côté Convex (le plugin `stripe` de Better Auth n'est pas supporté par le composant NPM). Webhook signé Paystack → http action Convex qui pose le tier.
4. **Orgs** : une org = **agence/équipe partageant UN pipeline** (pas du multi-sièges creux, pas un ATS entreprise). **Différée** à un déclencheur (vrai prospect équipe). Le jour venu : **Local Install de Better Auth** (décision figée pour éviter une 2e migration).
5. **Espace Opportunités** : **fusion** de Pipeline + Opportunités en un seul espace avec sélecteur de vue **Liste / Tableau / Calendrier**, et **panneau split master-detail** partagé (liste/board à gauche, détail à droite, deep-link URL, sheet plein écran sur mobile).
6. **Facturation** : **récurrent mensuel + annuel** (annuel = 2 mois offerts). Pas d'essai limité au début (le gratuit est l'entonnoir). Grille de départ ci-dessous, ajustable.
7. **Phasage** : UX d'abord (maintenant) → billing en test mode pendant la review Paystack → IA → orgs au déclencheur.
8. **Suivi** : ce `ROADMAP.md` (source de vérité) + **milestones GitHub** (1 par phase).

## Grille tarifaire (XOF, ancres de départ)

| Palier | Mensuel | Annuel (2 mois offerts) | Débloque |
|---|---|---|---|
| **Découverte** (gratuit) | 0 | 0 | Pipeline, saisie manuelle, ~25 opportunités, 1 veille, import manuel |
| **Pro** (premium) | ~3 500 XOF | ~35 000 XOF | Opportunités illimitées, veille auto + recherches multiples, vues multiples, analytique, relances, export |
| **Pro+ IA** (super premium) | ~9 000 XOF | ~90 000 XOF | Tout Pro + IA (scoring de pertinence, brouillons candidature/email/CV), quota de crédits IA/mois, au-delà à l'usage |
| **Équipe / Entreprise** (phase tardive) | par siège, sur devis | — | Orgs, pipeline partagé, rôles |

Équivalents carte/international (Paystack gère l'USD) : Pro ≈ 5 $/mois, Pro+ ≈ 13 $/mois.

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

### Phase 2 — Abonnements & paliers (Paystack, test mode)
Pendant la review Paystack (~7 j). Tout testable sans charge réelle, bascule live keys à l'activation.

- [ ] Champ `plan` sur `users` (`free` / `pro` / `pro_ai`) + `planRenewsAt`, `subscriptionRef`
- [ ] **Helper de gating central** (limites freemium : plafond opportunités, 1 veille, import manuel)
- [ ] Page **Tarifs** (mensuel/annuel, XOF, comparatif paliers)
- [ ] Intégration **Paystack test mode** : Initialize Transaction / Plans + Subscriptions
- [ ] **Webhook signé** Paystack → http action Convex (vérif signature) qui pose le tier
- [ ] Application des limites dans les queries/mutations + UI d'upsell
- [ ] Bascule clés live à l'activation du compte

### Phase 3 — Super premium IA
Industrialise le savoir-faire manuel (kits de candidature). Coût variable → métrage.

- [ ] Scoring de pertinence d'une opportunité vs profil
- [ ] Brouillon auto lettre / email / CV ciblé par opportunité
- [ ] Quota de crédits IA/mois par palier + métrage + au-delà à l'usage
- [ ] Matching sémantique veille (au-delà du mot-clé)

### Phase 4 — Orgs & équipes (déclenchée par un prospect équipe)
Coût lourd, ne se lance qu'au déclencheur réel.

- [ ] **Local Install de Better Auth** + plugin `organization`
- [ ] Modèle org + membres + rôles (owner/membre)
- [ ] Re-scoping des tables métier par `orgId` (migration depuis `userId`)
- [ ] Pipeline partagé, invitations, tier Entreprise (par siège, sur devis)

---

## Suivi

- Ce fichier = plan + avancement (cases cochées + datées à chaque livraison).
- Milestones GitHub : 1 par phase (Phase 1 à 4).
