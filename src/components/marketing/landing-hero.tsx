import { Link } from '@tanstack/react-router'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { useSession } from '~/lib/auth/auth-client'
import { Button } from '~/components/ui/button'
import { PipelinePreview } from '~/components/marketing/pipeline-preview'
import { m } from '~/lib/paraglide/messages'

/**
 * Hero de la landing, direction « zed-style » : tout est CENTRÉ (eyebrow, titre,
 * sous-titre, CTA), beaucoup d'air vertical, un glow doux CENTRÉ derrière le
 * titre, et le titre en dégradé subtil (indigo -> encre via bg-clip-text),
 * lisible en clair comme en sombre. L'aperçu produit est une grande figure
 * cadrée CENTRÉE sous le hero (vitrine, pas en colonne latérale).
 *
 * Le titre est le moment signature : révélation mot par mot via SplitText (cf.
 * use-landing-motion). Le contenu est rendu statiquement au SSR — il peint
 * immédiatement (LCP) et le mouvement enrichit après le mount.
 */
export function LandingHero() {
  const { data: session, isPending } = useSession()
  const authed = !isPending && Boolean(session)

  return (
    <section className="relative overflow-hidden">
      {/* Signature : glow centré derrière le titre + grille décorative (aria-hidden). */}
      <HeroBackdrop />

      <div className="relative mx-auto w-full max-w-screen-xl px-4 pb-16 pt-20 md:px-6 md:pb-24 md:pt-28 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span
            data-hero-rise
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs font-medium text-fg-muted backdrop-blur-sm"
          >
            <span className="size-1.5 rounded-full bg-accent shadow-[0_0_0_4px_var(--color-accent-soft)]" />
            {m.hero_eyebrow()}
          </span>

          <h1
            data-hero-title
            className="hero-title-gradient mt-6 text-balance text-[clamp(2.5rem,7vw,5rem)] font-bold leading-[1.02] tracking-[-0.035em]"
          >
            {m.hero_title()}
          </h1>

          <p
            data-hero-rise
            className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-fg-muted md:text-lg"
          >
            {m.hero_subtitle()}
          </p>

          <div
            data-hero-rise
            className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row"
          >
            {authed ? (
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link to="/app">
                  {m.hero_cta_app()}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link to="/inscription">
                  {m.cta_start_free()}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              asChild
            >
              <a href="#produit">{m.hero_cta_product()}</a>
            </Button>
          </div>

          <p
            data-hero-rise
            className="mt-5 flex items-center gap-2 text-xs text-fg-subtle"
          >
            <ShieldCheck className="size-3.5" />
            {m.hero_reassurance()}
          </p>
        </div>

        {/* Vitrine produit : grande figure cadrée, centrée, sous le hero. */}
        <div
          data-hero-visual
          className="relative mx-auto mt-16 w-full max-w-5xl md:mt-20"
        >
          <div className="rounded-[var(--radius-lg)] border border-border bg-surface/80 p-2 shadow-[var(--shadow-pop)] backdrop-blur-sm sm:p-3">
            <PipelinePreview className="border-0 bg-transparent p-0 shadow-none" />
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * Fond du hero, style zed : UN glow doux CENTRÉ derrière le titre (radial accent
 * dosé) + une grille décorative discrète qui s'estompe. 100% CSS/SVG (aucune
 * image lourde), purement décoratif (aria-hidden). Le glow s'anime en CSS au
 * load (opacité + léger scale, <800ms), statique sous prefers-reduced-motion.
 */
function HeroBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Glow centré, signature unique, entrée CSS-only, SSR-safe. */}
      <div className="hero-glow" />
      <svg
        className="absolute inset-0 size-full opacity-[0.05] [mask-image:radial-gradient(closest-side_at_50%_35%,black,transparent_75%)]"
        preserveAspectRatio="none"
        viewBox="0 0 1200 800"
        fill="none"
      >
        <defs>
          <pattern
            id="hero-grid"
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M48 0H0V48"
              stroke="currentColor"
              strokeWidth="1"
              className="text-fg"
            />
          </pattern>
        </defs>
        <rect width="1200" height="800" fill="url(#hero-grid)" />
      </svg>
    </div>
  )
}
