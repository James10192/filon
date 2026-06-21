# Filon · état de la roadmap (manifeste persistant)

> Mettre à jour après chaque batch. Source de traçabilité cross-session. Vérifier toujours contre `gh issue list` + `git log`.
> Dernière mise à jour : 2026-06-21.

## Fait (livré + déployé sur filon-xi.vercel.app)
- Phase 1 (espace Opportunités unifié Liste/Tableau/Calendrier + split master-detail), Phase 2 (abonnements Paystack, live + souscriptions carte natives + cycle de vie), couche de conversion intelligente.
- Phase 3 (IA à l'acte : scoring + brouillons + crédits métrés) + radar de prospection multi-source + auth sociale Google/GitHub + photo de profil.
- Phase IA v1 (copilot in-app `convex/agent/*`, route /app/copilot + slide-over, crédits, gating, generative-UI).
- Modèle cible/source/particuliers + propositions multi-destinataires + étiquettes + onboarding adaptatif + Documents 360 + carnet particuliers.
- Phase 4 partielle : /admin + feedback in-app livrés. Orgs/équipes + rôles + head-sell priority flagging livrés (commit `05cc2f3`).
- i18n FR/EN complet (site + app).

## En cours (⚠ non commité sur main — NE PAS CLOBBER)
- **Phase IA v2 : BYOK + Copilot Max** — working tree principal a des modifs non commitées : `convex/{billing,pricing,paystack,paystackPlans,paystackRenewal,schema,admin,agent/*,aiChat,aiCredits,aiPermissions,lib/{aiGate,plan,paystackPlans}}`, `messages/{fr,en}.json`, `src/components/{billing,copilot,admin,settings,marketing/pricing-section}/*`, `src/lib/billing/*`, + fichiers neufs `convex/byok.ts`, `convex/lib/crypto.ts`, `src/components/settings/byok-section.tsx`, `public/.well-known/`. **Doit être commité/mergé avant de démarrer Phase 5/6/7** (collision sur `convex/schema.ts` + `messages/*.json`).

## Prochain cadrage — Croissance & marketing relationnel (2026-06-21)
3 piliers actés (cf. ROADMAP.md décisions 14-16 + mémoire projet `filon-mlm-positioning`) :
1. Multi-métiers sur la landing (ne vend qu'aux freelances aujourd'hui).
2. Wedge MLM : complémenter l'app entreprise, JAMAIS dupliquer son dashboard de commissions. Objectif de palier dérivé du pipeline.
3. Affiliation Filon = moteur viral (la cible fait la pub).

### Milestones GitHub créés
- **#5 Phase 5 — Landing multi-métiers & conversion** : issues #25, #26, #27.
- **#6 Phase 6 — Affiliation Filon (parrainage produit)** : issues #28, #29, #30, #31, #32, #33 (#33 = v2 cash payout).
- **#7 Phase 7 — Marketing relationnel (wedge MLM)** : issues #34, #35, #36.

### Groupes de parallélisme / non-collision
> ⚠ Hotspots partagés par ces phases : `convex/schema.ts` (P6 + P7) et `messages/{fr,en}.json` (P5 + P6 + P7). Ces phases sont donc **largement séquentielles**, peu parallélisables sur le repo app.

- **BLOQUÉ tant que la Phase IA v2 (BYOK) n'est pas commitée** (elle tient schema.ts + messages/*.json).
- **Batch 1 = Phase 5 SOLO** : un seul agent (touche `messages/*.json` + `src/components/marketing/landing-personas.tsx` + `src/routes/index.tsx`). Petit, sans schéma. Bonne reprise.
- **Batch 2 = Phase 6** : séquentiel (schéma → attribution → reward webhook → dashboard → landing). Touche schema.ts + Paystack (prudence renouvellement) + messages. Ne pas paralléliser avec P7 (schema.ts commun).
- **Batch 3 = Phase 7** : séquentiel après P6 (schema.ts commun).
- Docs `filon-docs` (repo séparé) : toujours parallèle-safe si besoin.

## Phases futures (backlog, déjà tracé ROADMAP.md)
- Phase IA monétisation v2 (Copilot Max, fair-use soft, BYOK, modes Auto/Bypass) — partiellement en cours (BYOK uncommitted).
- Phase 4 orgs (Local Install Better Auth, re-scoping orgId) — au déclencheur.
- Durcissement prod : filtre localisation veille (no-op à brancher ou retirer), audit états d'erreur, matching sémantique veille.

## Actions Marcel (hors agents)
- Commit/merge la Phase IA v2 (BYOK + Copilot Max) en cours, pour débloquer Phase 5/6/7.
- Décision Phase 6 : montant exact de la récompense d'affiliation (mois offerts v1) et règles (1 vs 2 niveaux plafonnés).
