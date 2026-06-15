import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { authClient } from '~/lib/auth/auth-client'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import { GoogleIcon } from './google-icon'
import { GithubIcon } from './github-icon'

type Provider = 'google' | 'github'

/**
 * Boutons « Continuer avec Google / GitHub » partagés par les pages de
 * connexion et d'inscription. Le clic lance le flux OAuth Better Auth, qui
 * redirige vers le provider puis revient sur `callbackURL` ; le JWT est alors
 * propagé à Convex par le retour de callback (pas de window.location manuel
 * ici, contrairement au sign-in e-mail). On gère un état de chargement par
 * provider et on n'affiche un toast d'erreur qu'en cas d'échec au lancement.
 */
export function SocialAuthButtons({
  disabled = false,
  callbackURL = '/app',
}: {
  disabled?: boolean
  callbackURL?: string
}) {
  const [pending, setPending] = useState<Provider | null>(null)

  async function onSocial(provider: Provider) {
    setPending(provider)
    try {
      const { error } = await authClient.signIn.social({
        provider,
        callbackURL,
      })
      if (error) {
        setPending(null)
        toast.error('La connexion a échoué. Réessayez.')
      }
      // En cas de succès, le navigateur est redirigé vers le provider :
      // on laisse l'état « pending » actif jusqu'à la redirection.
    } catch {
      setPending(null)
      toast.error('La connexion a échoué. Réessayez.')
    }
  }

  const busy = disabled || pending !== null

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={busy}
        onClick={() => void onSocial('google')}
      >
        {pending === 'google' ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GoogleIcon className="size-4" />
        )}
        Continuer avec Google
      </Button>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={busy}
        onClick={() => void onSocial('github')}
      >
        {pending === 'github' ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GithubIcon className="size-4" />
        )}
        Continuer avec GitHub
      </Button>

      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-fg-subtle">ou</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  )
}
