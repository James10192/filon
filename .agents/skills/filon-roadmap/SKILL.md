---
name: filon-roadmap
description: Relaunch and orchestrate the Filon product roadmap across sessions. Reads the persistent roadmap state, shows what is done / in progress / next, and launches a worktree-isolated multi-agent workflow to execute the next parallel-safe batch. Use when resuming Filon, when asked to "continue/relaunch the roadmap", or to coordinate a team of agents on Filon.
disable-model-invocation: true
---

# Filon · Roadmap orchestrator

Reprend et fait avancer la roadmap produit de Filon, y compris dans une session neuve. Tout est consigné de façon persistante et traçable.

## Sources de vérité, persistantes, survivent à une nouvelle session
1. `ROADMAP.md`, racine du repo, vision, journal de décisions, phases, grille tarifaire.
2. `GitHub`, `James10192/filon`, milestones = phases, issues = tâches. `gh issue list --state open` et `gh api repos/James10192/filon/milestones`.
3. `references/roadmap-state.md`, cette skill, manifeste : statut de chaque chantier + groupes de parallélisme, quoi peut tourner en parallèle, quoi est solo.

La TodoList de session, `TaskCreate`, n'est pas persistante : ne jamais s'y fier entre sessions. Toujours relire les 3 sources ci-dessus.

## Étape 1, lire l'état
- `cat ROADMAP.md`, statut des phases.
- `gh issue list --repo James10192/filon --state open` + `--state closed --limit 40`, ce qui reste et ce qui est fait.
- Lire `references/roadmap-state.md` pour les groupes de parallélisme et le prochain batch.
- `cd filon && git status --short && git log --oneline -5`, état du repo.

## Étape 2, choisir le prochain batch, règles de non-collision
Règle d'or : un seul writer par fichier. Pour paralléliser sans corrompre :
- Repos séparés = toujours parallèle-safe : la doc, `filon-docs`, Astro Starlight, n'entre jamais en collision avec `filon`.
- i18n = toujours solo : touche quasiment chaque string/composant, ne jamais le paralléliser avec autre chose sur `filon`.
- Chantiers à fichiers disjoints peuvent tourner en parallèle en worktrees isolés, puis merge séquentiel via `gh pr merge` + `git merge --ff-only` :
  - Landing/marketing, `src/components/marketing/*`, `src/routes/index.tsx` vers app, `src/routes/app/*`, `src/components/{app,opportunities,proposals,...}`.
  - Hotspots partagés, `src/styles/app.css`, `convex/schema.ts`, `src/routeTree.gen.ts` : un seul agent à la fois doit les toucher. Si deux chantiers les touchent, séquencer.
- Jamais lancer un agent `filon` sur le working tree principal pendant qu'un autre agent y tourne, sans worktree.

## Étape 3, lancer l'orchestration, équipe d'agents
Adapter et lancer le workflow `scripts/orchestrate-roadmap.template.js`, outil Workflow, qui :
- lance en `parallel()` les chantiers du batch courant, chacun en `agent(..., { isolation: 'worktree' })`, isolation filesystem, zéro collision pendant l'exécution,
- chaque agent commit sur sa branche + ouvre une PR, pas de merge, pas de deploy,
- l'orchestrateur, toi, merge ensuite séquentiellement via `gh pr merge <n> --merge --admin` puis `git fetch origin main && git merge --ff-only origin/main`, et déploie une fois à la fin.

Éditer le template pour : a, ne mettre que les tâches du batch parallèle-safe courant, b, i18n et tout chantier touchant un hotspot partagé, en phase séquentielle séparée, pas dans le `parallel`.

## Conventions agents, à rappeler dans chaque prompt
- pnpm uniquement. Jamais `.env*`. Jamais commit `r3-pipe.png`. Jamais `git add -A`/`.` , chemins explicites.
- Commits conventionnels, pas de `Co-Authored-By`, pas de `Generated with Claude Code`.
- Deploy : `npx vercel deploy --prebuilt --prod --yes`, Nitro vercel preset. Convex : `npx convex deploy`, additif only, prod `decisive-mongoose-364`. Build OOM : `NODE_OPTIONS=--max-old-space-size=8192`, zombies node : `taskkill /F /IM node.exe`.
- Vérif visuelle obligatoire des livrables UI via dev-browser sur l'URL prod, le SSR `vite dev` a un quirk React : screenshots desktop + mobile, light + dark, contrôle overflow. Itérer jusqu'à propre.
- No god code, fichiers >250 LOC / composants >150 LOC = splitter, optimisation, production ready, FR sans tiret long, code en anglais, scope Convex via `requireUser`, jamais `undefined` en arg Convex.

## Étape 4, consigner, traçabilité
Après chaque batch : mettre à jour `ROADMAP.md`, cases + dates, et `references/roadmap-state.md`, statut + prochain batch, fermer les issues via `Closes #N` dans les commits, créer milestones/issues pour les nouvelles phases. C'est ce qui rend la roadmap relançable à l'identique en session neuve.

## Règles liées, déjà globales
- `~/.claude/rules/multi-agent-git-safety.md`, worktrees, anti-reset, PR-via-gh + ff-only.
- `~/.claude/rules/marcel-saas-starter.md`, stack. `~/.claude/rules/tailwind-v4-cursor-pointer.md`.
