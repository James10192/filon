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
import { LandingCreator } from '~/components/marketing/landing-creator'
import { LandingOrigin } from '~/components/marketing/landing-origin'
import { LandingCta } from '~/components/marketing/landing-cta'
import { useLandingMotion } from '~/components/marketing/use-landing-motion'
import { m } from '~/lib/paraglide/messages'

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
 * Landing publique — direction premium « zed-style » : surface light-first,
 * fond quasi-blanc, encre profonde, un seul accent indigo, hero centré, titre
 * en dégradé, glow centré derrière le titre, vitrine produit en cartes nettes.
 *
 * Le thème (clair/sombre) est piloté par le ThemeProvider global (defaut =
 * préférence système, override persistant en localStorage) : la classe `.dark`
 * vit sur <html>, la landing s'y adapte via les tokens sémantiques. Aucune
 * surface forcée ici (la landing ouvre en clair quand le système est clair).
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
    <div ref={scopeRef} className="bg-bg text-fg">
      <a href="#contenu" className="skip-link">
        {m.auth_skip_link()}
      </a>
      <MarketingHeader />

      <div id="smooth-wrapper" className="bg-bg">
        <div id="smooth-content" className="bg-bg text-fg">
          <main id="contenu" className="flex min-h-[100dvh] flex-col">
            <LandingHero />
            <LandingProblem />
            <LandingPillars />
            <LandingShowcase />
            <PricingSection />
            <LandingProof />
            <LandingCreator />
            <LandingOrigin />
            <LandingCta />
          </main>
          <MarketingFooter />
        </div>
      </div>
    </div>
  )
}
