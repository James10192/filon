import { Link } from '@tanstack/react-router'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { useSession } from '~/lib/auth/auth-client'
import { Button } from '~/components/ui/button'
import { PipelinePreview } from '~/components/marketing/pipeline-preview'

/**
 * Hero de la landing. Le titre est le moment signature : révélation mot par mot
 * via SplitText (cf. use-landing-motion). Le contenu est rendu statiquement au
 * SSR — il peint immédiatement (LCP) et le mouvement enrichit après le mount.
 */
export function LandingHero() {
  const { data: session, isPending } = useSession()
  const authed = !isPending && Boolean(session)

  return (
    <section className="relative overflow-hidden">
      {/* Signature : faisceau spotlight + veine décorative discrète (aria-hidden). */}
      <VeinBackdrop />

      <div className="relative mx-auto w-full max-w-screen-xl px-4 pb-20 pt-16 md:px-6 md:pb-28 md:pt-24 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="flex flex-col items-start">
            <span
              data-hero-rise
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs font-medium text-fg-muted"
            >
              <span className="size-1.5 rounded-full bg-accent shadow-[0_0_0_4px_var(--color-accent-soft)]" />
              Pipeline · Veille · Assistance IA
            </span>

            <h1
              data-hero-title
              className="mt-6 text-balance text-[clamp(2.5rem,6.5vw,4.75rem)] font-bold leading-[1.02] tracking-[-0.035em] text-fg"
            >
              Le filon qui transforme votre prospection en pipeline.
            </h1>

            <p
              data-hero-rise
              className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-fg-muted md:text-lg"
            >
              Candidatures, propositions spontanées, prospection freelance et
              missions vivent dans un seul tableau. Vous savez toujours qui
              relancer, quand, et où en est chaque piste.
            </p>

            <div
              data-hero-rise
              className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
            >
              {authed ? (
                <Button size="lg" asChild>
                  <Link to="/app">
                    Aller à mon espace
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ) : (
                <Button size="lg" asChild>
                  <Link to="/inscription">
                    Commencer gratuitement
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              )}
              <Button size="lg" variant="outline" asChild>
                <a href="#produit">Voir le produit</a>
              </Button>
            </div>

            <p
              data-hero-rise
              className="mt-5 flex items-center gap-2 text-xs text-fg-subtle"
            >
              <ShieldCheck className="size-3.5" />
              Sans carte bancaire · Vos données restent privées
            </p>

            {/* Bandeau de stats « assay » : signature mono + tabular-nums. */}
            <dl
              data-hero-rise
              className="mt-12 grid w-full max-w-lg grid-cols-3 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-border bg-border"
            >
              <Stat value="4" label="types de pistes" suffix="" />
              <Stat value="3" label="vues du pipeline" suffix="" />
              <Stat value="0" label="relance oubliée" suffix="" />
            </dl>
          </div>

          <div data-hero-visual className="lg:translate-x-2">
            <PipelinePreview />
          </div>
        </div>
      </div>
    </section>
  )
}

function Stat({
  value,
  label,
  suffix,
}: {
  value: string
  label: string
  suffix: string
}) {
  return (
    <div className="bg-surface px-4 py-4">
      <dd className="assay text-3xl font-semibold leading-none text-fg">
        {value}
        {suffix && <span className="text-accent">{suffix}</span>}
      </dd>
      <dt className="mt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
        {label}
      </dt>
    </div>
  )
}

/**
 * Fond du hero : UNE signature « spotlight » (faisceau de lumière depuis le
 * haut, style Aceternity, dosé) + une veine décorative discrète (fines lignes +
 * halo accent). 100% SVG/CSS (pas d'image lourde), purement décoratif. Le
 * spotlight s'anime en CSS au load (opacité + léger skew, <800ms), statique sous
 * prefers-reduced-motion. Le halo a un parallax léger via [data-parallax].
 */
function VeinBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Faisceau spotlight : signature unique, entrée CSS-only, SSR-safe. */}
      <div className="hero-spotlight" />
      <div
        data-parallax="6"
        className="absolute -right-32 -top-40 size-[34rem] rounded-full opacity-[0.18] blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, var(--color-accent), transparent)',
        }}
      />
      <svg
        className="absolute inset-0 size-full opacity-[0.06]"
        preserveAspectRatio="none"
        viewBox="0 0 1200 800"
        fill="none"
      >
        <defs>
          <pattern
            id="vein-grid"
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
        <rect width="1200" height="800" fill="url(#vein-grid)" />
      </svg>
    </div>
  )
}
