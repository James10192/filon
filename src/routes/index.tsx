import { createFileRoute, Link } from '@tanstack/react-router'
import {
  KanbanSquare,
  BellRing,
  Users,
  FileText,
  ArrowRight,
  Briefcase,
  Send,
  Radar,
  ShieldCheck,
} from 'lucide-react'
import { useSession } from '~/lib/auth/auth-client'
import { Button } from '~/components/ui/button'
import { MarketingHeader } from '~/components/marketing/marketing-header'
import { MarketingFooter } from '~/components/marketing/marketing-footer'
import { PipelinePreview } from '~/components/marketing/pipeline-preview'
import { PricingSection } from '~/components/marketing/pricing-section'

export const Route = createFileRoute('/')({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: 'Filon · Ne laissez plus filer une opportunité de revenu' },
      {
        name: 'description',
        content:
          'Filon réunit vos candidatures, vos propositions spontanées et votre prospection freelance dans un seul pipeline. Vous savez toujours qui relancer, quand, et où en est chaque piste.',
      },
    ],
  }),
})

const FEATURES = [
  {
    icon: KanbanSquare,
    title: 'Un pipeline kanban pour tout suivre',
    description:
      "De la piste au contrat signé, faites glisser chaque opportunité d'une étape à l'autre. Candidatures, propositions spontanées, prospection freelance et missions en cours : tout vit dans le même tableau.",
  },
  {
    icon: BellRing,
    title: "Des relances que vous n'oubliez plus",
    description:
      "Planifiez une relance sur chaque opportunité. Filon vous montre ce qui est à faire aujourd'hui, ce qui est en retard, et ce qui arrive. Plus de piste perdue faute d'un suivi.",
  },
  {
    icon: Users,
    title: 'Vos contacts reliés à chaque piste',
    description:
      "Rattachez interlocuteurs et entreprises à vos opportunités. Retrouvez en un coup d'oeil avec qui vous avez échangé, quand, et à quel sujet.",
  },
  {
    icon: FileText,
    title: 'Vos documents et vos chiffres à portée',
    description:
      "Gardez le bon CV et la bonne lettre face à chaque candidature. Et suivez votre activité d'un tableau de bord : pistes actives, taux de réponse, revenus en jeu.",
  },
] as const

const AUDIENCES = [
  {
    icon: Radar,
    title: 'Freelances et indépendants',
    description:
      'Suivez votre prospection, vos devis et vos missions sans rien laisser filer entre deux contrats.',
  },
  {
    icon: Briefcase,
    title: 'Développeurs et profils tech en recherche',
    description:
      "Centralisez vos candidatures et vos relances, gardez le contrôle de votre recherche d'emploi.",
  },
  {
    icon: Send,
    title: 'Consultants et profils en propositions spontanées',
    description:
      "Démarchez les bonnes entreprises, gardez le fil de chaque échange jusqu'à la signature.",
  },
] as const

function LandingPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg">
      <MarketingHeader />
      <main className="flex-1">
        <Hero />
        <Problem />
        <Features />
        <Audiences />
        <PricingSection />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  )
}

function Hero() {
  const { data: session, isPending } = useSession()
  const authed = !isPending && Boolean(session)
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-16 md:px-6 md:py-24 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="flex flex-col items-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-fg-muted">
              <span className="size-1.5 rounded-full bg-accent" />
              Votre pipeline d'opportunités, au même endroit
            </span>

            <h1 className="mt-6 text-balance text-[clamp(2.2rem,6vw,4rem)] font-bold leading-[1.05] tracking-[-0.03em] text-fg">
              Ne laissez plus filer une seule opportunité.
            </h1>

            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-fg-muted md:text-lg">
              Filon réunit vos candidatures, vos propositions spontanées et
              votre prospection freelance dans un seul pipeline. Vous savez
              toujours qui relancer, quand, et où en est chaque piste.
            </p>

            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
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
                <a href="#fonctionnalites">Voir comment ça marche</a>
              </Button>
            </div>

            <p className="mt-4 flex items-center gap-2 text-xs text-fg-subtle">
              <ShieldCheck className="size-3.5" />
              Sans carte bancaire · Vos données restent privées
            </p>
          </div>

          <PipelinePreview className="lg:translate-x-2" />
        </div>
      </div>
    </section>
  )
}

function Problem() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-16 md:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-accent">
            Le constat
          </p>
          <h2 className="mt-3 text-balance text-2xl font-semibold tracking-[-0.02em] text-fg md:text-3xl">
            Vos opportunités sont éparpillées partout.
          </h2>
          <p className="mt-5 text-pretty text-base leading-relaxed text-fg-muted">
            Un mail ici, un message LinkedIn là, une candidature dans un onglet,
            une relance prévue dans votre tête. Résultat : des pistes qui
            refroidissent, des relances oubliées, des contrats qui partent
            ailleurs. Filon remet tout au même endroit et vous dit quoi faire
            ensuite.
          </p>
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section
      id="fonctionnalites"
      className="scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-screen-xl px-4 py-16 md:px-6 md:py-24 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-accent">
            Ce que fait Filon
          </p>
          <h2 className="mt-3 text-balance text-2xl font-semibold tracking-[-0.02em] text-fg md:text-3xl">
            Un pipeline, et tout devient clair.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[var(--shadow-card)] transition-colors hover:border-border-strong"
              >
                <span className="flex size-10 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent">
                  <Icon className="size-5" />
                </span>
                <h3 className="text-base font-semibold tracking-[-0.01em] text-fg">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-fg-muted">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Audiences() {
  return (
    <section
      id="pour-qui"
      className="scroll-mt-20 border-t border-border bg-surface"
    >
      <div className="mx-auto w-full max-w-screen-xl px-4 py-16 md:px-6 md:py-24 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-accent">
            Pour qui
          </p>
          <h2 className="mt-3 text-balance text-2xl font-semibold tracking-[-0.02em] text-fg md:text-3xl">
            Pensé pour ceux qui cherchent et qui vendent leurs services.
          </h2>
          <p className="mt-3 text-base text-fg-muted">
            Filon s'adapte à votre façon de générer du revenu.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {AUDIENCES.map((audience) => {
            const Icon = audience.icon
            return (
              <div
                key={audience.title}
                className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-bg p-6"
              >
                <span className="flex size-10 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent">
                  <Icon className="size-5" />
                </span>
                <h3 className="text-base font-semibold tracking-[-0.01em] text-fg">
                  {audience.title}
                </h3>
                <p className="text-sm leading-relaxed text-fg-muted">
                  {audience.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  const { data: session, isPending } = useSession()
  const authed = !isPending && Boolean(session)
  return (
    <section>
      <div className="mx-auto w-full max-w-screen-xl px-4 py-16 md:px-6 md:py-24 lg:px-8">
        <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-border bg-surface px-6 py-14 text-center shadow-[var(--shadow-card)] md:px-12">
          <h2 className="max-w-2xl text-balance text-2xl font-semibold tracking-[-0.02em] text-fg md:text-3xl">
            Reprenez la main sur vos opportunités.
          </h2>
          <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-fg-muted">
            Quelques minutes pour tout centraliser. Aucune raison de laisser
            filer le prochain contrat.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            {authed ? (
              <Button size="lg" asChild>
                <Link to="/app">
                  Aller à mon espace
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild>
                  <Link to="/inscription">
                    Créer mon compte
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Link
                  to="/connexion"
                  className="text-sm font-medium text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
                >
                  J'ai déjà un compte
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
