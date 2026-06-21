import {
  Briefcase,
  GraduationCap,
  HeartHandshake,
  Home,
  ShieldCheck,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'

/**
 * Bandeau « Filon parle votre métier » : la landing reflète le persona lens déjà
 * présent dans l'app (le pipeline se renomme selon l'activité). Chaque métier
 * trouve une phrase qui lui parle, au lieu de ne vendre qu'aux freelances. La
 * carte « marketing relationnel » est mise en avant (accent) : segment prioritaire.
 * Révélation groupée au scroll ([data-reveal] + ScrollTrigger.batch).
 */
type Persona = {
  icon: LucideIcon
  label: () => string
  desc: () => string
  /** Met la carte en avant (segment prioritaire). */
  featured?: boolean
}

const PERSONAS: Persona[] = [
  {
    icon: HeartHandshake,
    label: m.personas_relationnel_label,
    desc: m.personas_relationnel_desc,
    featured: true,
  },
  {
    icon: Target,
    label: m.personas_commercial_label,
    desc: m.personas_commercial_desc,
  },
  {
    icon: Briefcase,
    label: m.personas_freelance_label,
    desc: m.personas_freelance_desc,
  },
  {
    icon: Home,
    label: m.personas_immo_label,
    desc: m.personas_immo_desc,
  },
  {
    icon: ShieldCheck,
    label: m.personas_assurance_label,
    desc: m.personas_assurance_desc,
  },
  {
    icon: Users,
    label: m.personas_recruteur_label,
    desc: m.personas_recruteur_desc,
  },
  {
    icon: GraduationCap,
    label: m.personas_emploi_label,
    desc: m.personas_emploi_desc,
  },
]

export function LandingPersonas() {
  return (
    <section className="border-t border-border bg-bg">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-20 md:px-6 md:py-28 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p data-reveal className="eyebrow">
            {m.personas_eyebrow()}
          </p>
          <h2
            data-reveal
            className="mt-3 text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.025em] text-fg md:text-[2.5rem]"
          >
            {m.personas_title()}
          </h2>
          <p
            data-reveal
            className="mt-4 text-pretty text-base leading-relaxed text-fg-muted"
          >
            {m.personas_subtitle()}
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:mt-16 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONAS.map((persona) => (
            <PersonaCard key={persona.label()} {...persona} />
          ))}
        </div>
      </div>
    </section>
  )
}

function PersonaCard({ icon: Icon, label, desc, featured }: Persona) {
  return (
    <div
      data-reveal
      className={cn(
        'flex flex-col gap-4 rounded-[var(--radius-lg)] border bg-surface p-6 shadow-[var(--shadow-card)] transition-colors md:p-7',
        featured
          ? 'border-accent/40 ring-1 ring-accent/20'
          : 'border-border hover:border-border-strong',
      )}
    >
      <span
        className={cn(
          'flex size-11 items-center justify-center rounded-[var(--radius)]',
          featured ? 'bg-accent text-white' : 'bg-accent-soft text-accent',
        )}
      >
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
