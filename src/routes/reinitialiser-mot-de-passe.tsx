import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Loader2, AlertCircle } from 'lucide-react'
import { authClient } from '~/lib/auth/auth-client'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { AuthShell } from '~/components/marketing/auth-shell'

export const Route = createFileRoute('/reinitialiser-mot-de-passe')({
  component: ReinitialiserPage,
  // Le jeton arrive en query string (?token=…). Better Auth peut aussi renvoyer
  // ?error=INVALID_TOKEN : on lit les deux pour afficher un état honnête.
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Nouveau mot de passe · Filon' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
})

const schema = z
  .object({
    password: z.string().min(8, 'Au moins 8 caractères.'),
    confirm: z.string().min(1, 'Confirmez le mot de passe.'),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirm'],
  })

type FieldErrors = Partial<Record<'password' | 'confirm', string>>

function ReinitialiserPage() {
  const { token, error: linkError } = Route.useSearch()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const invalidLink = !token || linkError === 'INVALID_TOKEN'

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setErrors({})
    if (!token) return

    const fd = new FormData(e.currentTarget)
    const parsed = schema.safeParse({
      password: String(fd.get('password') ?? ''),
      confirm: String(fd.get('confirm') ?? ''),
    })
    if (!parsed.success) {
      const next: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (key === 'password' || key === 'confirm') {
          next[key] = next[key] ?? issue.message
        }
      }
      setErrors(next)
      return
    }

    setSubmitting(true)
    const { error } = await authClient.resetPassword({
      newPassword: parsed.data.password,
      token,
    })
    setSubmitting(false)

    if (error) {
      setFormError(
        'Ce lien est invalide ou a expiré. Demandez-en un nouveau.',
      )
      return
    }

    toast.success('Mot de passe mis à jour. Vous pouvez vous connecter.')
    navigate({ to: '/connexion' })
  }

  if (invalidLink) {
    return (
      <AuthShell
        title="Lien invalide"
        subtitle="Ce lien de réinitialisation est incomplet ou a expiré."
        footer={
          <Link
            to="/connexion"
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            Retour à la connexion
          </Link>
        }
      >
        <Button asChild className="w-full">
          <Link to="/mot-de-passe-oublie">Demander un nouveau lien</Link>
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Nouveau mot de passe"
      subtitle="Choisissez un mot de passe d'au moins 8 caractères."
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
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            autoFocus
            disabled={submitting}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
          {errors.password && (
            <p id="password-error" className="text-xs text-danger">
              {errors.password}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">Confirmer le mot de passe</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={submitting}
            aria-invalid={Boolean(errors.confirm)}
            aria-describedby={errors.confirm ? 'confirm-error' : undefined}
          />
          {errors.confirm && (
            <p id="confirm-error" className="text-xs text-danger">
              {errors.confirm}
            </p>
          )}
        </div>

        {formError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-[var(--radius)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger"
          >
            <AlertCircle className="size-4 shrink-0" />
            {formError}
          </div>
        )}

        <Button type="submit" className="mt-2 w-full" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitting ? 'Mise à jour…' : 'Mettre à jour'}
        </Button>
      </form>
    </AuthShell>
  )
}
