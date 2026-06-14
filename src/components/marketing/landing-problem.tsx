import { ArrowRight } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'

/**
 * Problème → solution. Colonne gauche : l'éparpillement (texte barré, ton
 * « avant »). Colonne droite : ce que Filon remet en ordre. Révélation au
 * scroll via [data-reveal].
 */
export function LandingProblem() {
  const scattered = [
    m.problem_before_1(),
    m.problem_before_2(),
    m.problem_before_3(),
    m.problem_before_4(),
  ]
  const ordered = [
    m.problem_after_1(),
    m.problem_after_2(),
    m.problem_after_3(),
    m.problem_after_4(),
  ]
  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-20 md:px-6 md:py-28 lg:px-8">
        <p data-reveal className="eyebrow">
          {m.problem_eyebrow()}
        </p>
        <h2
          data-reveal
          className="mt-3 max-w-3xl text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.025em] text-fg md:text-[2.5rem]"
        >
          {m.problem_title()}
        </h2>

        <div className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-border bg-border md:grid-cols-2">
          <div data-reveal className="flex flex-col gap-4 bg-bg p-8 md:p-10">
            <span className="eyebrow text-fg-subtle">{m.problem_before_label()}</span>
            <ul className="flex flex-col gap-3 text-base text-fg-muted">
              {scattered.map((item) => (
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
              {m.problem_before_note()}
            </p>
          </div>

          <div
            data-reveal
            className="relative flex flex-col gap-4 bg-surface p-8 md:p-10"
          >
            <span className="eyebrow text-accent">{m.problem_after_label()}</span>
            <ul className="flex flex-col gap-3 text-base text-fg">
              {ordered.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <ArrowRight className="mt-1 size-4 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-sm text-fg-muted">
              {m.problem_after_note()}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
