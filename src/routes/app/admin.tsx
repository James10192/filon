import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { ShieldAlert, Loader2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { PageToolbar } from '~/components/app/page-toolbar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { AdminUsersPanel } from '~/components/admin/admin-users-panel'
import { AdminMetricsPanel } from '~/components/admin/admin-metrics-panel'
import { AdminFeedbackPanel } from '~/components/admin/admin-feedback-panel'
import { AdminPaymentsPanel } from '~/components/admin/admin-payments-panel'

type AdminTab = 'utilisateurs' | 'metriques' | 'feedbacks' | 'paiements'

export const Route = createFileRoute('/app/admin')({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: 'Filon · Administration' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: AdminTab; compte?: string } => {
    const tab = search.tab
    const out: { tab?: AdminTab; compte?: string } = {}
    if (
      tab === 'metriques' ||
      tab === 'feedbacks' ||
      tab === 'paiements' ||
      tab === 'utilisateurs'
    ) {
      out.tab = tab
    }
    if (typeof search.compte === 'string' && search.compte.length > 0) {
      out.compte = search.compte
    }
    return out
  },
})

/**
 * Back-office /admin : protégé par `api.admin.amIAdmin` (query publique non
 * gatée). Tant que la réponse est `undefined` on patiente ; `false` redirige
 * vers /app. Trois sections (Utilisateurs, Métriques, Feedbacks) en onglets,
 * l'onglet actif est persisté dans l'URL (?tab=).
 */
function AdminPage() {
  const isAdmin = useQuery(api.admin.amIAdmin, {})
  const navigate = useNavigate()

  useEffect(() => {
    if (isAdmin === false) {
      void navigate({ to: '/app', replace: true })
    }
  }, [isAdmin, navigate])

  if (isAdmin === undefined) return <AdminGuardLoading />
  if (isAdmin === false) return <AdminForbidden />

  return <AdminContent />
}

function AdminContent() {
  const { tab, compte } = Route.useSearch()
  const navigate = useNavigate()
  const active = tab ?? 'utilisateurs'

  const selectAccount = (userId: string | null) =>
    navigate({
      to: '/app/admin',
      search: (prev) => {
        const next: { tab?: AdminTab; compte?: string } = {
          tab: (prev.tab as AdminTab | undefined) ?? 'utilisateurs',
        }
        if (userId) next.compte = userId
        return next
      },
      replace: true,
    })

  return (
    <div className="flex flex-col">
      <PageToolbar
        title="Administration"
        subtitle="Vue d'ensemble des comptes, de l'activité et des retours utilisateurs."
      />

      <Tabs
        value={active}
        onValueChange={(value) =>
          navigate({
            to: '/app/admin',
            search: { tab: value as AdminTab },
            replace: true,
          })
        }
        className="gap-5"
      >
        {/* Onglets : sur mobile, on autorise le défilement horizontal pour ne
            jamais rogner un onglet sous 360px (la barre garde sa largeur de
            contenu mais devient scrollable). */}
        <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="w-max">
            <TabsTrigger value="utilisateurs">Utilisateurs</TabsTrigger>
            <TabsTrigger value="metriques">Métriques</TabsTrigger>
            <TabsTrigger value="feedbacks">Feedbacks</TabsTrigger>
            <TabsTrigger value="paiements">Paiements</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="utilisateurs">
          <AdminUsersPanel
            selectedUserId={compte ?? null}
            onSelect={selectAccount}
          />
        </TabsContent>
        <TabsContent value="metriques">
          <AdminMetricsPanel />
        </TabsContent>
        <TabsContent value="feedbacks">
          <AdminFeedbackPanel />
        </TabsContent>
        <TabsContent value="paiements">
          <AdminPaymentsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AdminGuardLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-accent" />
    </div>
  )
}

function AdminForbidden() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
      <span className="flex size-12 items-center justify-center rounded-[var(--radius)] bg-danger-soft text-danger">
        <ShieldAlert className="size-6" />
      </span>
      <p className="text-base font-semibold text-fg">Accès réservé</p>
      <p className="max-w-sm text-sm text-fg-muted">
        Cette zone est réservée aux administrateurs. Redirection en cours.
      </p>
    </div>
  )
}
