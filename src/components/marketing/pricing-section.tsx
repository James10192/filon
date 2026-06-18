import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'
import { IntervalToggle } from '~/components/billing/interval-toggle'
import { PlanCardShell } from '~/components/billing/plan-card'
import { PLAN_CARDS } from '~/components/billing/plan-catalogue'
import type { Interval } from '~/lib/billing/plan'
import { m } from '~/lib/paraglide/messages'

/**
 * Section Tarifs de la landing publique. Réutilise le catalogue et la coquille
 * de carte in-app (alignement identique : grille `auto-rows-fr`, cartes
 * `h-full flex flex-col`, CTA `mt-auto`), mais adaptée au contexte public :
 * aucun appel Convex, CTA vers l'inscription. Révélation GSAP au scroll
 * (gsap brut + context + ScrollTrigger, respecte prefers-reduced-motion).
 */
export function PricingSection() {
  const [interval, setInterval] = useState<Interval>('monthly')
  const sectionRef = useRef<HTMLElement | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const grid = gridRef.current
    const section = sectionRef.current
    if (!grid || !section) return

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (prefersReduced) return

    let ctx: { revert: () => void } | undefined
    let cancelled = false

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ])
      if (cancelled) return
      gsap.registerPlugin(ScrollTrigger)

      ctx = gsap.context(() => {
        const cards = gsap.utils.toArray<HTMLElement>('[data-pricing-card]')
        gsap.set(cards, { autoAlpha: 0, y: 20 })
        gsap.to(cards, {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          ease: 'power2.out',
          stagger: 0.08,
          scrollTrigger: {
            trigger: section,
            start: 'top 78%',
            once: true,
          },
        })
      }, section)
    })()

    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="tarifs"
      className="scroll-mt-20 border-t border-border bg-surface"
    >
      <div className="mx-auto w-full max-w-screen-xl px-4 py-20 md:px-6 md:py-28 lg:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow">{m.pricing_eyebrow()}</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.025em] text-fg md:text-[2.5rem]">
            {m.pricing_title()}
          </h2>
          <p className="mt-4 text-base text-fg-muted">
            {m.pricing_subtitle()}
          </p>
        </div>

        <div className="mt-10 flex justify-center sm:justify-start">
          <IntervalToggle value={interval} onChange={setInterval} />
        </div>

        <div
          ref={gridRef}
          className="mt-10 grid items-stretch gap-4 sm:auto-rows-fr sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
          {PLAN_CARDS.map((card) => (
            <div key={card.key} data-pricing-card className="h-full">
              <PlanCardShell
                data={card}
                interval={interval}
                cta={<PublicCta planKey={card.key} featured={card.featured} />}
              />
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-3xl text-sm text-fg-subtle">
          {m.pricing_payment_note()}
        </p>
      </div>
    </section>
  )
}

/** CTA public : inscription pour les paliers self-service, contact pour Équipe. */
function PublicCta({
  planKey,
  featured,
}: {
  planKey: (typeof PLAN_CARDS)[number]['key']
  featured?: boolean
}) {
  if (planKey === 'team') {
    return (
      <Button variant="outline" className="w-full" asChild>
        <a href="mailto:djedjelipatrick@gmail.com?subject=Filon%20%C3%89quipe">
          {m.pricing_cta_contact()}
        </a>
      </Button>
    )
  }

  const label =
    planKey === 'free' ? m.cta_start_free() : m.cta_create_account()

  return (
    <Button
      variant={featured ? 'default' : 'outline'}
      className="w-full"
      asChild
    >
      <Link to="/inscription">{label}</Link>
    </Button>
  )
}
