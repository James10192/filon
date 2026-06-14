import { Code2, Terminal, HeartHandshake } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Preuve sociale honnête : pas de faux logos clients. Filon est construit par
 * un dev, pour les devs et indépendants. On assume l'angle « outil d'artisan ».
 * Citation en mono-style (« assay ») pour ancrer la signature.
 */
export function LandingProof() {
  return (
    <section className="border-t border-border bg-bg">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-20 md:px-6 md:py-28 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.85fr] lg:gap-16">
          <div data-reveal className="flex flex-col">
            <p className="eyebrow">L'esprit du produit</p>
            <h2 className="mt-3 text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.025em] text-fg md:text-[2.5rem]">
              Construit par un dev, pour les devs et les indépendants.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-fg-muted">
              Filon est né d'un besoin concret : arrêter de perdre des
              opportunités faute de suivi. Pas de bloat, pas de CRM
              tentaculaire. Un instrument précis, rapide, qui fait une chose et
              la fait bien.
            </p>

            <figure className="mt-10 border-l-2 border-accent pl-5">
              <blockquote className="assay text-pretty text-base leading-relaxed text-fg">
                « Un filon, c'est une veine de minerai. Le bon lead, au bon
                moment. Filon vous aide à ne plus le rater. »
              </blockquote>
            </figure>
          </div>

          <div className="grid gap-px self-start overflow-hidden rounded-[var(--radius-lg)] border border-border bg-border sm:grid-cols-2 lg:grid-cols-1">
            {VALUES.map((value) => (
              <Value key={value.title} {...value} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Value({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div data-reveal className="flex items-start gap-4 bg-surface p-6">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
        <Icon className="size-4.5" />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-fg-muted">
          {description}
        </p>
      </div>
    </div>
  )
}

const VALUES = [
  {
    icon: Terminal,
    title: 'Rapide, comme un bon outil',
    description:
      'Interface dense et nette, raccourcis, zéro chargement inutile. Pensé pour la vitesse.',
  },
  {
    icon: Code2,
    title: 'Sans bloat',
    description:
      'Le strict nécessaire pour piloter votre prospection. Rien à désapprendre.',
  },
  {
    icon: HeartHandshake,
    title: 'Vos données vous appartiennent',
    description:
      'Privées par défaut, exportables quand vous voulez. Aucune revente.',
  },
] as const
