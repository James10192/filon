import { ArrowRight } from 'lucide-react'

/**
 * Problème → solution. Colonne gauche : l'éparpillement (texte barré, ton
 * « avant »). Colonne droite : ce que Filon remet en ordre. Révélation au
 * scroll via [data-reveal].
 */
export function LandingProblem() {
  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-20 md:px-6 md:py-28 lg:px-8">
        <p data-reveal className="eyebrow">
          Le constat
        </p>
        <h2
          data-reveal
          className="mt-3 max-w-3xl text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.025em] text-fg md:text-[2.5rem]"
        >
          Vos opportunités sont éparpillées. Les bonnes finissent par filer.
        </h2>

        <div className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-border bg-border md:grid-cols-2">
          <div data-reveal className="flex flex-col gap-4 bg-bg p-8 md:p-10">
            <span className="eyebrow text-fg-subtle">Avant Filon</span>
            <ul className="flex flex-col gap-3 text-base text-fg-muted">
              {SCATTERED.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 line-through decoration-fg-subtle/40"
                >
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-fg-subtle/50" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-sm text-fg-subtle">
              Des pistes qui refroidissent, des relances oubliées, des contrats
              qui partent ailleurs.
            </p>
          </div>

          <div
            data-reveal
            className="relative flex flex-col gap-4 bg-surface p-8 md:p-10"
          >
            <span className="eyebrow text-accent">Avec Filon</span>
            <ul className="flex flex-col gap-3 text-base text-fg">
              {ORDERED.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <ArrowRight className="mt-1 size-4 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-sm text-fg-muted">
              Tout au même endroit. Filon vous dit quoi faire ensuite.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

const SCATTERED = [
  'Un mail ici, un message LinkedIn là',
  'Une candidature perdue dans un onglet',
  'Une relance prévue « dans votre tête »',
  'Aucune visibilité sur le revenu en jeu',
] as const

const ORDERED = [
  'Chaque piste au bon stade du pipeline',
  'Les relances datées, jamais oubliées',
  'Contacts et documents rattachés',
  'Le revenu potentiel suivi en temps réel',
] as const
