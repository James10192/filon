import { Link } from '@tanstack/react-router'
import { ArrowRight, Gift } from 'lucide-react'
import { useSession } from '~/lib/auth/auth-client'
import { Button } from '~/components/ui/button'
import { m } from '~/lib/paraglide/messages'

/**
 * Section affiliation « Le cercle Filon ». Parle directement a la cible
 * (professionnels de la recommandation) : partage ton lien, gagne des mois
 * offerts. Double devoir : argument de conversion ET boucle virale. CTA
 * auth-aware (connecte → page Parrainage, sinon → inscription).
 */
export function LandingAffiliation() {
  const { data: session, isPending } = useSession()
  const authed = !isPending && Boolean(session)

  const points = [
    m.affiliation_point_1(),
    m.affiliation_point_2(),
    m.affiliation_point_3(),
  ]

  return (
    <section className="border-t border-border bg-bg">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-20 md:px-6 md:py-28 lg:px-8">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-[var(--radius-lg)] border border-accent/30 bg-surface shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-6 p-8 md:p-12">
            <span className="flex size-12 items-center justify-center rounded-[var(--radius)] bg-accent text-white">
              <Gift className="size-6" />
            </span>
            <div>
              <p data-reveal className="eyebrow">
                {m.affiliation_eyebrow()}
              </p>
              <h2
                data-reveal
                className="mt-3 text-balance text-2xl font-semibold leading-[1.15] tracking-[-0.02em] text-fg md:text-3xl"
              >
                {m.affiliation_title()}
              </h2>
              <p
                data-reveal
                className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-fg-muted"
              >
                {m.affiliation_desc()}
              </p>
            </div>

            <ul className="flex flex-col gap-2.5 border-t border-border pt-6">
              {points.map((point) => (
                <li
                  key={point}
                  className="flex items-center gap-2.5 text-sm text-fg-muted"
                >
                  <span className="size-1.5 rounded-full bg-accent" />
                  {point}
                </li>
              ))}
            </ul>

            <div>
              <Button size="lg" asChild>
                <Link to={authed ? '/app/parrainage' : '/inscription'}>
                  {m.affiliation_cta()}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
