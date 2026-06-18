import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { authClient } from '~/lib/auth/auth-client'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { GoogleIcon } from '~/components/marketing/google-icon'
import { GithubIcon } from '~/components/marketing/github-icon'

type SocialProvider = 'google' | 'github'

/** Providers sociaux gérés dans l'UI de liaison. */
const PROVIDERS: Array<{
  id: SocialProvider
  label: string
  icon: (className: string) => React.ReactNode
}> = [
  { id: 'google', label: 'Google', icon: (c) => <GoogleIcon className={c} /> },
  { id: 'github', label: 'GitHub', icon: (c) => <GithubIcon className={c} /> },
]

/** Une ligne de compte renvoyée par `listAccounts()`. */
type LinkedAccount = { providerId: string; accountId?: string }

/**
 * Section « Connexions » : liste les comptes liés (Google, GitHub) et permet
 * de lier / délier chaque provider. Garde-fou de sécurité : on empêche de
 * délier le DERNIER moyen de connexion (pas de mot de passe et un seul compte
 * social), sinon l'utilisateur se verrouillerait dehors. La déliaison passe
 * par une confirmation Radix (jamais window.confirm).
 */
export function LinkedAccountsSection() {
  const [accounts, setAccounts] = useState<LinkedAccount[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [pending, setPending] = useState<SocialProvider | null>(null)
  const [confirmUnlink, setConfirmUnlink] = useState<SocialProvider | null>(
    null,
  )

  const refresh = useCallback(async () => {
    const { data, error } = await authClient.listAccounts()
    if (error || !data) {
      setLoadError(true)
      setAccounts(null)
      return
    }
    setLoadError(false)
    setAccounts(data.map((a) => ({ providerId: a.providerId, accountId: a.accountId })))
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Un compte e-mail/mot de passe apparaît sous le providerId "credential".
  const hasPassword = (accounts ?? []).some((a) => a.providerId === 'credential')
  const linkedProviders = new Set((accounts ?? []).map((a) => a.providerId))
  const socialLinkedCount = PROVIDERS.filter((p) =>
    linkedProviders.has(p.id),
  ).length

  /**
   * Délier un provider verrouillerait l'utilisateur s'il s'agit de son unique
   * moyen de connexion (aucun mot de passe + un seul compte social lié).
   */
  function isLastLoginMethod(provider: SocialProvider) {
    return !hasPassword && socialLinkedCount <= 1 && linkedProviders.has(provider)
  }

  async function onLink(provider: SocialProvider) {
    setPending(provider)
    try {
      const { error } = await authClient.linkSocial({
        provider,
        callbackURL: '/app/parametres',
      })
      if (error) {
        setPending(null)
        toast.error(m.app_link_error())
      }
      // En cas de succès, redirection vers le provider : on garde l'état.
    } catch {
      setPending(null)
      toast.error(m.app_link_error())
    }
  }

  async function onUnlink(provider: SocialProvider) {
    setConfirmUnlink(null)
    setPending(provider)
    try {
      const { error } = await authClient.unlinkAccount({ providerId: provider })
      if (error) {
        toast.error(
          error.message ?? m.app_unlink_error(),
        )
        return
      }
      toast.success(m.app_unlink_success())
      await refresh()
    } catch {
      toast.error(m.app_unlink_error())
    } finally {
      setPending(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.app_connections_title()}</CardTitle>
        <CardDescription>
          {m.app_connections_description()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {accounts === null && !loadError ? (
          <div className="flex items-center gap-2 rounded-[var(--radius)] border border-border bg-surface-2 p-4 text-sm text-fg-muted">
            <Loader2 className="size-4 animate-spin" />
            {m.app_connections_loading()}
          </div>
        ) : loadError ? (
          <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-fg-muted">
              {m.app_connections_load_error()}
            </p>
            <Button
              variant="outline"
              className="h-11 shrink-0"
              onClick={() => void refresh()}
            >
              {m.app_retry()}
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {PROVIDERS.map((provider) => {
              const isLinked = linkedProviders.has(provider.id)
              const isPending = pending === provider.id
              const lastMethod = isLastLoginMethod(provider.id)

              return (
                <li
                  key={provider.id}
                  className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {provider.icon('size-5 shrink-0')}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-fg">
                        {provider.label}
                      </p>
                      <p className="mt-0.5 text-sm text-fg-muted">
                        {isLinked
                          ? lastMethod
                            ? m.app_connection_last_method()
                            : m.app_connection_linked()
                          : m.app_connection_not_linked()}
                      </p>
                    </div>
                  </div>

                  {isLinked ? (
                    <Button
                      variant="outline"
                      className="h-11 shrink-0"
                      disabled={isPending || lastMethod}
                      title={
                        lastMethod
                          ? m.app_unlink_blocked_hint()
                          : undefined
                      }
                      onClick={() => setConfirmUnlink(provider.id)}
                    >
                      {isPending && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      {m.app_unlink()}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="h-11 shrink-0"
                      disabled={isPending}
                      onClick={() => void onLink(provider.id)}
                    >
                      {isPending && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      {m.app_link()}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      <AlertDialog
        open={confirmUnlink !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmUnlink(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.app_unlink_confirm_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.app_unlink_confirm_desc()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending !== null}>
              {m.app_cancel()}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (confirmUnlink) void onUnlink(confirmUnlink)
              }}
              disabled={pending !== null}
            >
              {pending !== null && <Loader2 className="size-4 animate-spin" />}
              {m.app_unlink()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
