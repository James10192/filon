import { useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { MarketingHeader } from '~/components/marketing/marketing-header'
import { MarketingFooter } from '~/components/marketing/marketing-footer'
import { LandingHero } from '~/components/marketing/landing-hero'
import { LandingProblem } from '~/components/marketing/landing-problem'
import { LandingPillars } from '~/components/marketing/landing-pillars'
import { LandingShowcase } from '~/components/marketing/landing-showcase'
import { PricingSection } from '~/components/marketing/pricing-section'
import { LandingProof } from '~/components/marketing/landing-proof'
import { LandingCta } from '~/components/marketing/landing-cta'
import { useLandingMotion } from '~/components/marketing/use-landing-motion'

export const Route = createFileRoute('/')({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: 'Filon · Le filon qui transforme votre prospection en pipeline' },
      {
        name: 'description',
        content:
          "Filon réunit vos candidatures, propositions spontanées et prospection freelance dans un seul pipeline. Pipeline unifié, veille automatique et assistance IA. Vous savez toujours qui relancer, quand, et où en est chaque piste.",
      },
    ],
  }),
})

/**
 * Landing publique — direction premium « zed-inspired » : surface marketing
 * sombre et dramatique, monochrome zinc + un seul accent indigo, signature
 * « assay » (JetBrains Mono + tabular-nums) sur les figures.
 *
 * La surface sombre est scopée via la classe `.dark` sur le conteneur racine :
 * elle réutilise les tokens dark déjà définis dans app.css (l'app reste
 * light-first en dehors de cette page).
 *
 * Le mouvement (GSAP brut, code-split, client-only) est orchestré par
 * useLandingMotion. Le contenu est entièrement rendu au SSR (statique, visible,
 * AA) ; le mouvement enrichit après le mount et se désactive intégralement sous
 * prefers-reduced-motion.
 *
 * ScrollSmoother enveloppe le contenu défilable (#smooth-wrapper/#smooth-content).
 * Le header sticky reste HORS du conteneur transformé pour rester fixe.
 */
function LandingPage() {
  const scopeRef = useRef<HTMLDivElement | null>(null)
  useLandingMotion(scopeRef)

  return (
    <div ref={scopeRef} className="dark bg-bg text-fg">
      <a href="#contenu" className="skip-link">
        Aller au contenu
      </a>
      <MarketingHeader />

      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main id="contenu" className="flex min-h-[100dvh] flex-col">
            <LandingHero />
            <LandingProblem />
            <LandingPillars />
            <LandingShowcase />
            <PricingSection />
            <LandingProof />
            <LandingCta />
          </main>
          <MarketingFooter />
        </div>
      </div>
    </div>
  )
}
