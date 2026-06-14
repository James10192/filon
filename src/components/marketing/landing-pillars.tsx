import { KanbanSquare, Radar, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Les 3 piliers produit. Cadrage réel (ce que ça fait, pas du marketing creux),
 * avec une numérotation « assay » mono. Révélation groupée au scroll
 * ([data-reveal] + ScrollTrigger.batch).
 */
export function LandingPillars() {
  return (
    <section
      id="produit"
      className="scroll-mt-20 border-t border-border bg-bg"
    >
      <div className="mx-auto w-full max-w-screen-xl px-4 py-20 md:px-6 md:py-28 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p data-reveal className="eyebrow">
            Trois piliers
          </p>
          <h2
            data-reveal
            className="mt-3 text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.025em] text-fg md:text-[2.5rem]"
          >
            Tout ce qu'il faut pour ne plus rien laisser filer.
          </h2>
        </div>

        <div className="mt-14 grid gap-4 md:mt-16 lg:grid-cols-3">
          {PILLARS.map((pillar, i) => (
            <Pillar key={pillar.title} index={i + 1} {...pillar} />
          ))}
        </div>
      </div>
    </section>
  )
}

function Pillar({
  index,
  icon: Icon,
  title,
  description,
  points,
}: {
  index: number
  icon: LucideIcon
  title: string
  description: string
  points: readonly string[]
}) {
  return (
    <div
      data-reveal
      className="group flex flex-col gap-5 rounded-[var(--radius-lg)] border border-border bg-surface p-8 shadow-[var(--shadow-card)] transition-colors hover:border-border-strong md:p-9"
    >
      <div className="flex items-center justify-between">
        <span className="flex size-11 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent">
          <Icon className="size-5" />
        </span>
        <span className="assay text-sm text-fg-subtle">
          0{index} / 03
        </span>
      </div>
      <div>
        <h3 className="text-lg font-semibold tracking-[-0.015em] text-fg">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          {description}
        </p>
      </div>
      <ul className="mt-auto flex flex-col gap-2 border-t border-border pt-5">
        {points.map((point) => (
          <li
            key={point}
            className="flex items-center gap-2 text-sm text-fg-muted"
          >
            <span className="size-1 rounded-full bg-accent" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  )
}

const PILLARS = [
  {
    icon: KanbanSquare,
    title: 'Pipeline unifié',
    description:
      "De la piste au contrat signé, faites glisser chaque opportunité d'une étape à l'autre. Candidatures, propositions, prospection et missions dans le même tableau.",
    points: [
      'Stages personnalisables, drag & drop',
      'Relances datées sur chaque piste',
      'Contacts et documents rattachés',
    ],
  },
  {
    icon: Radar,
    title: 'Veille automatique',
    description:
      'Définissez vos critères une fois. Filon surveille les offres et fait remonter les opportunités pertinentes, prêtes à entrer dans votre pipeline.',
    points: [
      'Recherches multiples et continues',
      'Nouvelles offres remontées en flux',
      'Import en un clic vers une piste',
    ],
  },
  {
    icon: Sparkles,
    title: 'Assistance IA',
    description:
      "Un scoring de pertinence sur vos opportunités, et des brouillons de lettre, e-mail ou CV ciblés. Vous gardez la main, l'IA fait le premier jet.",
    points: [
      'Scoring de pertinence des pistes',
      'Brouillons lettre / e-mail / CV',
      'Quota de crédits, au-delà à l’usage',
    ],
  },
] as const
