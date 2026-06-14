// TEMPLATE de workflow d'orchestration roadmap Filon (outil Workflow).
// À ÉDITER avant de lancer : ne garder que les chantiers du batch parallèle-safe
// courant (cf. references/roadmap-state.md). i18n et tout chantier touchant un
// hotspot partagé (app.css, schema.ts) => phase SÉQUENTIELLE, jamais dans parallel().
//
// Modèle git : chaque agent en isolation 'worktree' (zéro collision pendant
// l'exécution), commit sur sa branche + ouvre une PR, NE merge PAS, NE deploy PAS.
// L'orchestrateur merge ensuite séquentiellement (gh pr merge --admin + ff-only)
// et déploie UNE fois. Voir ~/.claude/rules/multi-agent-git-safety.md (règle #10).

export const meta = {
  name: 'filon-roadmap-batch',
  description: 'Execute the current parallel-safe roadmap batch on Filon via worktree-isolated agents, then sequential merge',
  phases: [
    { title: 'Parallel batch', detail: 'disjoint chantiers en worktrees isolés -> PRs' },
    { title: 'Solo', detail: 'i18n / hotspots, séquentiel' },
  ],
}

const FILON = 'C:\\Users\\yabla\\Downloads\\dev\\filon'

const COMMON =
  `Projet Filon (${FILON}) ou repo dédié. pnpm only, jamais .env*, jamais commit r3-pipe.png, jamais git add -A. ` +
  `Commits conventionnels chemins explicites, PAS de Co-Authored-By. Tu es en WORKTREE ISOLÉ : commit sur une branche feat/<x>, ` +
  `push la branche, ouvre une PR (gh pr create --base main), NE merge PAS, NE deploy PAS (le parent s'en charge). ` +
  `Vérif visuelle dev-browser sur prod. no god code, optimisation, production ready, FR sans tiret long. ` +
  `Détail des tâches : voir .claude/skills/filon-roadmap/references/roadmap-state.md.`

// --- Batch A : fichiers DISJOINTS -> parallèle en worktrees ------------------
phase('Parallel batch')
const batch = [
  { label: 'createur', prompt: `${COMMON}\nChantier: section créateur (style MailPulse) sur la landing (src/components/marketing/* + index.tsx).` },
  { label: 'mobile-bottombar', prompt: `${COMMON}\nChantier: bottombar mobile de l'app + responsive (src/routes/app/* + components/app/*).` },
  // docs = repo séparé ~/Downloads/dev/filon-docs (Astro Starlight) : pas de worktree filon.
]
const prs = await parallel(
  batch.map((t) => () =>
    agent(t.prompt, { label: t.label, phase: 'Parallel batch', isolation: 'worktree' }),
  ),
)
log(`Batch A terminé: ${prs.filter(Boolean).length}/${batch.length} PRs. ` +
    `=> Orchestrateur: merge séquentiel via gh pr merge <n> --merge --admin puis git fetch + merge --ff-only, deploy UNE fois.`)

// --- Batch B : SOLO (i18n) -- à lancer SÉPARÉMENT, après merge de A ----------
// Ne PAS inclure i18n dans le parallel() ci-dessus (touche tout).
// phase('Solo')
// await agent(`${COMMON}\nChantier i18n complet en/fr (Paraglide) site + app. SEUL writer.`, { label: 'i18n', phase: 'Solo' })

return { prs }
