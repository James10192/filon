import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useSession } from '~/lib/auth/auth-client'
import { Button } from '~/components/ui/button'
import { m } from '~/lib/paraglide/messages'

/**
 * CTA final. Bloc plein contraste (accent), centré. Auth-aware : renvoie vers
 * l'espace si connecté, sinon inscription. Révélation au scroll ([data-reveal]).
 */
export function LandingCta() {
  const { data: session, isPending } = useSession()
  const authed = !isPending && Boolean(session)

  return (
    <section className="border-t border-border bg-bg">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-20 md:px-6 md:py-28 lg:px-8">
        <div
          data-reveal
          className="relative flex flex-col items-center overflow-hidden rounded-[var(--radius-lg)] border border-accent/40 bg-surface px-6 py-16 text-center md:px-12 md:py-20"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-24 mx-auto size-[28rem] rounded-full opacity-20 blur-3xl"
            style={{
              background:
                'radial-gradient(closest-side, var(--color-accent), transparent)',
            }}
          />
          <p className="eyebrow relative text-accent">{m.cta_eyebrow()}</p>
          <h2 className="relative mt-3 max-w-2xl text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.025em] text-fg md:text-[2.75rem]">
            {m.cta_title()}
          </h2>
          <p className="relative mt-5 max-w-xl text-pretty text-base leading-relaxed text-fg-muted">
            {m.cta_subtitle()}
          </p>
          <div className="relative mt-9 flex flex-col items-center gap-4">
            {authed ? (
              <Button size="lg" asChild>
                <Link to="/app">
                  {m.hero_cta_app()}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild>
                  <Link to="/inscription">
                    {m.cta_create_account()}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Link
                  to="/connexion"
                  className="text-sm font-medium text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
                >
                  {m.cta_have_account()}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
