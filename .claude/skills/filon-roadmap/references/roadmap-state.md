# Filon · état de la roadmap (manifeste persistant)

> Mettre à jour après chaque batch. Source de traçabilité cross-session. Vérifier toujours contre `gh issue list` + `git log`.
> Dernière mise à jour : 2026-06-14.

## Fait (livré + déployé sur filon-xi.vercel.app)
- Hotfixes : ScrollSmoother landing, boutons icône panneau détail.
- Billing : Phase 1 (espace Opportunités unifié Liste/Tableau/Calendrier + split), Phase 2 (abonnements Paystack test mode), cycle de vie (cron expiration + upgrade/downgrade/annulation + "Gérer mon abonnement").
- Couche de conversion intelligente (LockedFeature/UpgradeNudge/UsageMeter, tier-aware).
- Landing v2 zed (clair, hero centré, titre dégradé, glow centré, showcase tab-switcher sans pin, spotlight, mobile sans overflow) + thème dark/light (système + toggle).
- Polish global : cursor:pointer (Tailwind v4), dropdowns non-modaux + scrollbar-gutter, scrollbar custom.

## En cours
- Espace **Propositions** unifié (vues + split master-detail) — issue #16-équivalent.

## Prochains batches (groupes de parallélisme)

### Batch parallèle A — worktrees isolés, fichiers disjoints
- **Section créateur** sur la landing (style MailPulse) — `src/components/marketing/*` + `src/routes/index.tsx`. Infos : N'Guessan Marcel Jacques Patrick DJEDJE-LI · Head of Development @ African Digit Consulting · Abidjan · Portfolio https://marcel-djedjeli-portfolio.vercel.app · GitHub https://github.com/James10192 · Marcel-_12@outlook.fr.
- **Mobile bottombar app + responsive** — `src/routes/app/*`, `src/components/app/*` (shell). Disjoint de la landing.
- **Docs Starlight** — REPO SÉPARÉ `~/Downloads/dev/filon-docs` (Astro Starlight, i18n + dark/light + recherche natifs). Toujours parallèle-safe.
- ⚠ Sérialiser si deux touchent `src/styles/app.css` (hotspot).

### Batch SOLO B — après A mergé
- **i18n complet en/fr** (Paraglide, compile-time) — site + app, touche presque tout → JAMAIS en parallèle.

## Phase IA — EN COURS (reprise nécessaire)
- **Backend LIVRÉ + committé** (`dc6ad2a feat(ai): copilot backend`) sur main : composant `@convex-dev/agent` + `convex/agent/*` (agent.ts, models.ts, instructions.ts, permissions.ts, queries.ts, mutations.ts, tools/{read,write,index}.ts), schéma additif aiCredits/aiUsage/aiPermissionPrefs/aiThreads, tier `copilot`, routage OpenRouter (slugs dans `convex/agent/models.ts`), gating + métrage. OPENROUTER_API_KEY en env prod.
- **Frontend RESTE À FAIRE** (les agents se bloquent sur la limite de session — reprendre en session neuve). À faire : lire `convex/agent/*` pour les noms de fonctions, installer **ai-elements** (registry shadcn), construire route `/app/copilot` + slide-over ⌘K avec `useThreadMessages({stream:true})` + `toUIMessages` de `@convex-dev/agent/react`, cartes de confirmation d'action (Ask : une fois/toujours/refuser), sélecteur de mode (Ask/Accept/Auto/Bypass), toggle Rapide/Qualité, compteur crédits, upsell. Puis convex deploy + build + vercel + agent-browser. Blueprint complet : sortie workflow `wet2tp39w` (fichier tasks).
- v1 = mode Ask. Décisions modèles/funnel/permission déjà actées (tâches #17/#20).

## Phases futures (roadmap, pas encore lancées)
- **Phase IA** : copilot in-app + IA agentique partout, débloquée par un NOUVEAU tier au-dessus de Pro+ IA. v1 = chatbot. Claude via actions Convex scopées, métré.
- **Phase 4** : orgs (Local Install Better Auth) + **/admin** (gérer users/orgs + métriques + feedbacks) + **système de feedback**. /admin et feedback décidés POUR la Phase 4.

## Actions Marcel (hors agents)
- Bascule clés **live** Paystack à l'activation prod : `npx convex env set PAYSTACK_SECRET_KEY sk_live_... --prod` + webhook live.
- Suivi : vraies souscriptions carte tokenisées (auto-renew) à l'activation.

## Grille tarifaire (rappel, à étendre du 5e tier IA)
Découverte 0 · Pro ~3 500 XOF/mois · Pro+ IA ~9 000 XOF/mois · [NOUVEAU tier IA agentique au-dessus] · Équipe sur devis.
