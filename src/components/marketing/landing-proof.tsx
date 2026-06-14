import { Code2, Terminal, HeartHandshake } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'

/**
 * Preuve sociale honnête : pas de faux logos clients. Filon est construit par
 * un dev, pour les devs et indépendants. On assume l'angle « outil d'artisan ».
 * Citation en mono-style (« assay ») pour ancrer la signature.
 */
export function LandingProof() {
  const VALUES = [
    {
      icon: Terminal,
      title: m.proof_value_fast_title(),
      description: m.proof_value_fast_desc(),
    },
    {
      icon: Code2,
      title: m.proof_value_nobloat_title(),
      description: m.proof_value_nobloat_desc(),
    },
    {
      icon: HeartHandshake,
      title: m.proof_value_data_title(),
      description: m.proof_value_data_desc(),
    },
  ]
  return (
    <section className="border-t border-border bg-bg">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-20 md:px-6 md:py-28 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.85fr] lg:gap-16">
          <div data-reveal className="flex flex-col">
            <p className="eyebrow">{m.proof_eyebrow()}</p>
            <h2 className="mt-3 text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.025em] text-fg md:text-[2.5rem]">
              {m.proof_title()}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-fg-muted">
              {m.proof_body()}
            </p>

            <figure className="mt-10 border-l-2 border-accent pl-5">
              <blockquote className="assay text-pretty text-base leading-relaxed text-fg">
                {m.proof_quote()}
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
