import { Wallet, Headset, Globe2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'

/**
 * Section « Origine » : assume fièrement l'ancrage ivoirien de Filon comme
 * levier marketing, sans casser l'identité monochrome zinc + accent indigo.
 * Le SEUL point de couleur orange/blanc/vert est le drapeau de Côte d'Ivoire
 * intégré au badge ; tout le reste reste sur les tokens sémantiques. Framing
 * inclusif : l'origine est un atout, pas une barrière. Révélation au scroll
 * ([data-reveal]) comme les autres sections.
 */
export function LandingOrigin() {
  const ASSETS = [
    {
      icon: Wallet,
      title: m.origin_pay_title(),
      description: m.origin_pay_desc(),
    },
    {
      icon: Headset,
      title: m.origin_support_title(),
      description: m.origin_support_desc(),
    },
    {
      icon: Globe2,
      title: m.origin_market_title(),
      description: m.origin_market_desc(),
    },
  ]

  return (
    <section className="border-t border-border bg-bg">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-20 md:px-6 md:py-28 lg:px-8">
        <div data-reveal className="flex flex-col items-center text-center">
          <p className="eyebrow text-accent">{m.origin_eyebrow()}</p>

          <span className="mt-5 inline-flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-2 text-sm font-medium text-fg">
            <IvoryFlag />
            {m.origin_badge()}
          </span>

          <h2 className="mt-6 max-w-3xl text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.025em] text-fg md:text-[2.5rem]">
            {m.origin_title()}
          </h2>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-fg-muted">
            {m.origin_intro()}
          </p>
        </div>

        <div
          data-reveal
          className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-border bg-border sm:grid-cols-2 lg:grid-cols-3"
        >
          {ASSETS.map((asset) => (
            <Asset key={asset.title} {...asset} />
          ))}
        </div>
      </div>
    </section>
  )
}

function Asset({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-4 bg-surface p-6 md:p-7">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
        <Icon className="size-4.5" />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
          {description}
        </p>
      </div>
    </div>
  )
}

/**
 * Drapeau de la Côte d'Ivoire en trois bandes verticales : orange (#f77f00),
 * blanc, vert (#009639). Arrondi propre, fine bordure pour le détacher du
 * fond. SEUL endroit de la section à porter ces couleurs.
 */
function IvoryFlag() {
  return (
    <span
      role="img"
      aria-label={m.origin_flag_aria()}
      className="flex h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px] border border-border shadow-sm"
    >
      <span className="h-full w-1/3" style={{ backgroundColor: '#f77f00' }} />
      <span className="h-full w-1/3" style={{ backgroundColor: '#ffffff' }} />
      <span className="h-full w-1/3" style={{ backgroundColor: '#009639' }} />
    </span>
  )
}
