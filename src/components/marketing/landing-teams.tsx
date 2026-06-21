import { Link } from '@tanstack/react-router'
import { ArrowRight, BarChart3, Star, Users, type LucideIcon } from 'lucide-react'
import { useSession } from '~/lib/auth/auth-client'
import { Button } from '~/components/ui/button'
import { m } from '~/lib/paraglide/messages'

/**
 * Section « Équipe / Manager ». Donne sa place a l'entreprise dans Filon : au-dela
 * du pipeline individuel, une organisation reunit les commerciaux, le head sell
 * pointe les priorites, le manager pilote (vue equipe + metriques + export). Reflete
 * la vraie feature org (roles admin/head_sell/commercial/sdr, flag de priorite). CTA
 * auth-aware (connecte → page Organisation, sinon → inscription). Revelation au
 * scroll ([data-reveal] + ScrollTrigger.batch).
 */
type Capability = {
  icon: LucideIcon
  label: () => string
  desc: () => string
}

const CAPABILITIES: Capability[] = [
  { icon: Users, label: m.teams_roles_label, desc: m.teams_roles_desc },
  { icon: Star, label: m.teams_priority_label, desc: m.teams_priority_desc },
  { icon: BarChart3, label: m.teams_metrics_label, desc: m.teams_metrics_desc },
]

export function LandingTeams() {
  const { data: session, isPending } = useSession()
  const authed = !isPending && Boolean(session)

  return (
    <section className="border-t border-border bg-bg">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-20 md:px-6 md:py-28 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p data-reveal className="eyebrow">
            {m.teams_eyebrow()}
          </p>
          <h2
            data-reveal
            className="mt-3 text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.025em] text-fg md:text-[2.5rem]"
          >
            {m.teams_title()}
          </h2>
          <p
            data-reveal
            className="mt-4 text-pretty text-base leading-relaxed text-fg-muted"
          >
            {m.teams_subtitle()}
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:mt-16 lg:grid-cols-3">
          {CAPABILITIES.map((cap) => (
            <CapabilityCard key={cap.label()} {...cap} />
          ))}
        </div>

        <div data-reveal className="mt-10 flex justify-center md:mt-12">
          <Button size="lg" asChild>
            <Link to={authed ? '/app/organisation' : '/inscription'}>
              {m.teams_cta()}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function CapabilityCard({ icon: Icon, label, desc }: Capability) {
  return (
    <div
      data-reveal
      className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[var(--shadow-card)] transition-colors hover:border-border-strong md:p-7"
    >
      <span className="flex size-11 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent">
        <Icon className="size-5" />
      </span>
      <div>
        <h3 className="text-lg font-semibold tracking-[-0.015em] text-fg">
          {label()}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{desc()}</p>
      </div>
    </div>
  )
}
