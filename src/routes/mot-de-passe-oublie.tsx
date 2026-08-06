import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { Loader2, AlertCircle, MailCheck } from 'lucide-react'
import { authClient } from '~/lib/auth/auth-client'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { AuthShell } from '~/components/marketing/auth-shell'

export const Route = createFileRoute('/mot-de-passe-oublie')({
  component: MotDePasseOubliePage,
  head: () => ({
    meta: [
      { title: 'Mot de passe oublié · Filon' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
})

const schema = z
  .string()
  .trim()
  .min(1, 'Renseignez votre adresse e-mail.')
  .pipe(z.email('Adresse e-mail invalide.'))

function MotDePasseOubliePage() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)
    const parsed = schema.safeParse(String(fd.get('email') ?? ''))
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Adresse e-mail invalide.')
      return
    }

    setSubmitting(true)
    const { error: reqError } = await authClient.requestPasswordReset({
      email: parsed.data,
      redirectTo: '/reinitialiser-mot-de-passe',
    })
    setSubmitting(false)

    if (reqError) {
      // L'e-mail transactionnel n'est pas configuré ou Resend a refusé l'envoi :
      // on le dit clairement plutôt que d'afficher un faux succès.
      setError(
        "L'envoi de l'e-mail a échoué. Réessayez plus tard ou contactez le support.",
      )
      return
    }
    // Succès volontairement neutre (pas d'énumération de comptes).
    setSent(true)
  }

  if (sent) {
    return (
      <AuthShell
        title="Vérifiez votre boîte mail"
        subtitle="Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé."
        footer={
          <Link
            to="/connexion"
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            Retour à la connexion
          </Link>
        }
      >
        <div className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface px-4 py-3.5 text-sm text-fg-muted">
          <MailCheck className="size-5 shrink-0 text-accent" />
          Le lien expire sous une heure. Pensez à vérifier vos spams.
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Saisissez votre adresse e-mail : nous vous enverrons un lien pour choisir un nouveau mot de passe."
      footer={
        <Link
          to="/connexion"
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          Retour à la connexion
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Adresse e-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="vous@exemple.com"
            autoComplete="email"
            autoFocus
            disabled={submitting}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'email-error' : undefined}
          />
          {error && (
            <p
              id="email-error"
              role="alert"
              className="flex items-center gap-1.5 text-xs text-danger"
            >
              <AlertCircle className="size-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <Button type="submit" className="mt-2 w-full" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitting ? 'Envoi…' : 'Envoyer le lien'}
        </Button>
      </form>
    </AuthShell>
  )
}
